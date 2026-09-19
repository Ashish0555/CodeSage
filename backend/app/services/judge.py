import time
import httpx
from app.core.config import get_settings

ALIASES = {'python': ('python', 'main.py'), 'cpp': ('c++', 'main.cpp'), 'java': ('java', 'Main.java'), 'javascript': ('javascript', 'main.js')}

def normalize(value=''): return '\n'.join(line.rstrip() for line in value.replace('\r\n', '\n').split('\n')).rstrip('\n')

def run_tests(language, code, cases, limit_ms=4000):
    if language not in ALIASES: raise ValueError(f'Unsupported language: {language}')
    runtime, filename = ALIASES[language]; results=[]; passed=0; max_time=0; saw_error=False
    with httpx.Client(base_url=get_settings().piston_url, timeout=20) as client:
        versions = client.get('/runtimes').json(); match = next((r for r in versions if r['language'] == runtime or runtime in r.get('aliases', [])), None)
        if not match: raise RuntimeError(f'No Piston runtime for {language}')
        for i, case in enumerate(cases):
            started=time.perf_counter(); response=client.post('/execute', json={'language': runtime, 'version': match['version'], 'files':[{'name': filename, 'content': code}], 'stdin': case.input or '', 'compile_timeout':10000, 'run_timeout':limit_ms}); data=response.json(); elapsed=round((time.perf_counter()-started)*1000); run=data.get('run') or {}; compile=data.get('compile') or {}
            if compile and compile.get('code') != 0: verdict='CE'; error=compile.get('stderr','Compilation error'); saw_error=True
            elif run.get('signal') and run.get('code') is None: verdict='TLE'; error=f"Timed out ({run['signal']})"; saw_error=True
            elif run.get('code', 0) != 0: verdict='RE'; error=(run.get('stderr') or '')[:500]; saw_error=True
            else: verdict='AC' if normalize(run.get('stdout','')) == normalize(case.expected_output) else 'WA'; error=''
            ok=verdict == 'AC'; passed += ok; max_time=max(max_time, elapsed); results.append({'index':i,'passed':ok,'timeMs':elapsed,'isHidden':case.is_hidden,'stderr':'' if case.is_hidden else error})
    verdict = 'CE' if any(r['stderr'] == 'Compilation error' for r in results) else 'AC' if passed == len(cases) else 'TLE' if any('Timed out' in r['stderr'] for r in results) else 'RE' if saw_error else 'WA'
    return {'verdict': verdict, 'passedCount': passed, 'totalCount': len(cases), 'runtimeMs': max_time, 'testResults': results}
