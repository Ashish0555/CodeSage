import json
from datetime import datetime, timezone
from fastapi import Depends, FastAPI, HTTPException, Query
from fastapi.middleware.cors import CORSMiddleware
from fastapi.responses import StreamingResponse
from sqlalchemy import func, select
from sqlalchemy.orm import Session
from app.core.config import get_settings
from app.core.security import admin_user, create_token, current_user, hash_password, safe_user, verify_password
from app.db.database import Base, engine, get_db
from app.models.models import AIReview, InterviewMessage, InterviewRole, InterviewSession, InterviewStatus, KnowledgeChunk, Problem, Submission, SubmissionVerdict, TestCase, User
from app.schemas import AskRequest, CodeRequest, HintRequest, IngestRequest, InterviewMessageIn, InterviewStart, Login, Register
from app.ai import service as ai
from app.services import judge

app = FastAPI(title='CodeSage API')
app.add_middleware(CORSMiddleware, allow_origins=[get_settings().client_url], allow_credentials=True, allow_methods=['*'], allow_headers=['*'])

@app.on_event('startup')
def startup(): Base.metadata.create_all(bind=engine)

def sse(events):
    return StreamingResponse((f'event: {name}\ndata: {json.dumps(data)}\n\n' for name, data in events), media_type='text/event-stream')

def problem_dict(p, include_tests=False):
    data = {'id':p.id, '_id':p.id, 'slug':p.slug, 'title':p.title, 'statement':p.statement, 'difficulty':p.difficulty.value, 'topics':p.topics or [], 'companies':p.companies or [], 'constraints':p.constraints, 'examples':p.examples, 'starterCode':p.starter_code, 'editorial':p.editorial, 'timeLimitMs':p.time_limit_ms}
    if include_tests:
        visible=[{'id':t.id,'input':t.input,'expectedOutput':t.expected_output,'isHidden':False} for t in p.test_cases if not t.is_hidden]; data.update(testCases=visible, hiddenTestCount=len(p.test_cases)-len(visible))
    return data

def submission_dict(s):
    return {'id':s.id, '_id':s.id, 'language':s.language, 'code':s.code, 'verdict':s.verdict.value, 'passedCount':s.passed_count, 'totalCount':s.total_count, 'runtimeMs':s.runtime_ms, 'testResults':s.test_results or [], 'createdAt':s.created_at, 'problem': {'slug':s.problem.slug,'title':s.problem.title,'difficulty':s.problem.difficulty.value} if s.problem else None}

@app.get('/api/health')
def health(): return {'ok': True, 'ai': bool(get_settings().gemini_api_key), 'ts': int(datetime.now().timestamp()*1000)}

@app.post('/api/auth/register', status_code=201)
def register(body: Register, db: Session = Depends(get_db)):
    if db.scalar(select(User).where(User.email == body.email)): raise HTTPException(409, 'Email already registered')
    user=User(name=body.name,email=body.email,password_hash=hash_password(body.password),stats={'solved':0,'attempts':0,'byTopic':{},'byDifficulty':{'easy':0,'medium':0,'hard':0}}); db.add(user); db.commit(); db.refresh(user)
    return {'token':create_token(user.id),'user':safe_user(user)}

@app.post('/api/auth/login')
def login(body: Login, db: Session = Depends(get_db)):
    user=db.scalar(select(User).where(User.email == body.email))
    if not user or not verify_password(body.password,user.password_hash): raise HTTPException(401,'Invalid email or password')
    return {'token':create_token(user.id),'user':safe_user(user)}

@app.get('/api/auth/me')
def me(user: User = Depends(current_user)): return {'user':safe_user(user)}

@app.get('/api/problems')
def list_problems(difficulty: str|None=None, topic: str|None=None, company: str|None=None, search: str|None=None, page: int=Query(1,ge=1), limit: int=Query(20,ge=1,le=50), db: Session=Depends(get_db)):
    query=select(Problem).order_by(Problem.created_at.asc())
    if difficulty: query=query.where(Problem.difficulty == difficulty)
    items=db.scalars(query).all(); items=[p for p in items if (not topic or topic in (p.topics or [])) and (not company or company in (p.companies or [])) and (not search or search.lower() in (p.title+' '+p.statement).lower())]
    total=len(items); items=items[(page-1)*limit:page*limit]
    return {'items':[{'id':p.id,'slug':p.slug,'title':p.title,'difficulty':p.difficulty.value,'topics':p.topics or [],'companies':p.companies or [],'createdAt':p.created_at} for p in items], 'total':total,'page':page,'limit':limit}

@app.get('/api/problems/{slug}')
def get_problem(slug: str, db: Session=Depends(get_db)):
    p=db.scalar(select(Problem).where(Problem.slug == slug));
    if not p: raise HTTPException(404,'Problem not found')
    return problem_dict(p, True)

def execute(body, user, db, save):
    p=db.scalar(select(Problem).where(Problem.slug == body.problemSlug))
    if not p: raise HTTPException(404,'Problem not found')
    cases=[t for t in p.test_cases if save or not t.is_hidden]
    try: result=judge.run_tests(body.language,body.code,cases,p.time_limit_ms)
    except ValueError as e: raise HTTPException(400,str(e))
    if not save: result['saved']=False; return result
    sub=Submission(user_id=user.id,problem_id=p.id,language=body.language,code=body.code,verdict=SubmissionVerdict(result['verdict']),passed_count=result['passedCount'],total_count=result['totalCount'],runtime_ms=result['runtimeMs'],test_results=result['testResults']); db.add(sub); db.commit(); db.refresh(sub)
    return {'submissionId':sub.id, **{k:result.get(k) for k in ('verdict','passedCount','totalCount','runtimeMs','testResults','compileOutput')}}

@app.post('/api/run')
def run_code(body: CodeRequest,user: User=Depends(current_user),db: Session=Depends(get_db)): return execute(body,user,db,False)
@app.post('/api/submissions', status_code=201)
def submit_code(body: CodeRequest,user: User=Depends(current_user),db: Session=Depends(get_db)): return execute(body,user,db,True)

@app.get('/api/submissions')
def list_submissions(problemSlug: str|None=None,user: User=Depends(current_user),db: Session=Depends(get_db)):
    query=select(Submission).where(Submission.user_id==user.id).order_by(Submission.created_at.desc()).limit(50); rows=db.scalars(query).all()
    if problemSlug: rows=[s for s in rows if s.problem and s.problem.slug == problemSlug]
    return {'items':[submission_dict(s) for s in rows]}

@app.get('/api/submissions/{submission_id}')
def get_submission(submission_id: str,user: User=Depends(current_user),db: Session=Depends(get_db)):
    s=db.scalar(select(Submission).where(Submission.id==submission_id,Submission.user_id==user.id))
    if not s: raise HTTPException(404,'Submission not found')
    return submission_dict(s)

@app.post('/api/ai/hint')
def hint(body: HintRequest,user: User=Depends(current_user),db: Session=Depends(get_db)):
    if not db.scalar(select(Problem).where(Problem.slug==body.problemSlug)): raise HTTPException(404,'Problem not found')
    problem = db.scalar(select(Problem).where(Problem.slug == body.problemSlug))
    return sse([('chunk',{'text':ai.hint(problem, body.level, body.code)}),('done',{'level':body.level})])

@app.post('/api/ai/review/{submission_id}')
def review(submission_id: str,user: User=Depends(current_user),db: Session=Depends(get_db)):
    s=db.scalar(select(Submission).where(Submission.id==submission_id,Submission.user_id==user.id));
    if not s: raise HTTPException(404,'Submission not found')
    old=db.scalar(select(AIReview).where(AIReview.submission_id==s.id))
    if old: return {'review':old,'cached':True}
    data=ai.review(s.problem,s.language,s.code,s.verdict.value,s.passed_count,s.total_count); row=AIReview(submission_id=s.id,user_id=user.id,model=data['model'],time_complexity=data['timeComplexity'],space_complexity=data['spaceComplexity'],code_quality_score=data['codeQualityScore'],strengths=data['strengths'],improvements=data['improvements'],edge_cases_missed=data['edgeCasesMissed'],grounded_verdict=s.verdict); db.add(row); db.commit(); db.refresh(row)
    return {'review':data,'cached':False}

@app.post('/api/ai/ask')
def ask(body: AskRequest,user: User=Depends(current_user),db: Session=Depends(get_db)):
    contexts=ai.search(db,body.question,body.topic,body.company); answer=ai.answer(body.question,contexts)
    return {'answer':answer,'sources':[{'n':i+1,'title':c.title,'source':c.source,'score':score,'preview':c.text[:160]} for i,(c,score) in enumerate(contexts)],'grounded':bool(contexts)}

@app.post('/api/interviews')
def start_interview(body: InterviewStart,user: User=Depends(current_user),db: Session=Depends(get_db)):
    p=db.scalar(select(Problem).where(Problem.slug==body.problemSlug));
    if not p: raise HTTPException(404,'Problem not found')
    session=InterviewSession(user_id=user.id,problem_id=p.id); db.add(session); db.flush(); opening=ai.interview(p, []); db.add(InterviewMessage(session_id=session.id,role=InterviewRole.interviewer,content=opening)); db.commit()
    return sse([('session',{'sessionId':session.id}),('chunk',{'text':opening}),('done',{'sessionId':session.id})])

@app.post('/api/interviews/{session_id}/message')
def interview_message(session_id: str,body: InterviewMessageIn,user: User=Depends(current_user),db: Session=Depends(get_db)):
    session=db.scalar(select(InterviewSession).where(InterviewSession.id==session_id,InterviewSession.user_id==user.id));
    if not session: raise HTTPException(404,'Interview session not found')
    if session.status == InterviewStatus.finished: raise HTTPException(409,'Interview already finished')
    db.add(InterviewMessage(session_id=session.id,role=InterviewRole.candidate,content=body.message)); db.flush(); messages=[{'role':message.role.value,'content':message.content} for message in session.messages]; reply=ai.interview(session.problem, messages); db.add(InterviewMessage(session_id=session.id,role=InterviewRole.interviewer,content=reply)); db.commit()
    return sse([('chunk',{'text':reply}),('done',{})])

@app.post('/api/interviews/{session_id}/finish')
def finish_interview(session_id: str,user: User=Depends(current_user),db: Session=Depends(get_db)):
    session=db.scalar(select(InterviewSession).where(InterviewSession.id==session_id,InterviewSession.user_id==user.id));
    if not session: raise HTTPException(404,'Interview session not found')
    evaluation=ai.evaluate([{'role':message.role.value,'content':message.content} for message in session.messages]); session.status=InterviewStatus.finished; session.final_evaluation=evaluation; session.finished_at=datetime.now(timezone.utc); db.commit(); return {'evaluation':evaluation,'sessionId':session.id}

@app.get('/api/interviews/{session_id}')
def get_interview(session_id: str,user: User=Depends(current_user),db: Session=Depends(get_db)):
    session=db.scalar(select(InterviewSession).where(InterviewSession.id==session_id,InterviewSession.user_id==user.id));
    if not session: raise HTTPException(404,'Interview session not found')
    return {'id':session.id,'_id':session.id,'status':session.status.value,'finalEvaluation':session.final_evaluation,'messages':[{'id':m.id,'role':m.role.value,'content':m.content,'ts':m.ts} for m in session.messages]}

@app.get('/api/me/stats')
def stats(user: User=Depends(current_user),db: Session=Depends(get_db)):
    rows=db.scalars(select(Submission).where(Submission.user_id==user.id)).all(); ac=[s for s in rows if s.verdict==SubmissionVerdict.AC]; solved={s.problem_id for s in ac}; difficulties={'Easy':0,'Medium':0,'Hard':0}
    for pid in solved:
        p=db.get(Problem,pid)
        if p: difficulties[p.difficulty.value]+=1
    verdicts={v.value:sum(s.verdict==v for s in rows) for v in SubmissionVerdict}; weighted=difficulties['Easy']+2*difficulties['Medium']+4*difficulties['Hard']; readiness=round((min(1,weighted/40)*.75+(len(ac)/len(rows) if rows else 0)*.25)*100)
    return {'solvedByDifficulty':difficulties,'totalSolved':len(solved),'verdicts':verdicts,'totalSubmissions':len(rows),'acceptanceRate':round(len(ac)/len(rows)*100) if rows else 0,'readinessScore':readiness,'recentSubmissions':[submission_dict(s) for s in rows[:10]]}

@app.post('/api/admin/kb/ingest',status_code=201)
def ingest(body: IngestRequest,user: User=Depends(admin_user),db: Session=Depends(get_db)):
    pieces=ai.chunk_text(body.text); db.add_all([KnowledgeChunk(text=p,embedding=ai.embed_document(p),title=body.title,source=body.source or body.title,topics=body.topics,companies=body.companies) for p in pieces]); db.commit(); return {'ingestedChunks':len(pieces)}
