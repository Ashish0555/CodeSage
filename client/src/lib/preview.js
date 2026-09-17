/**
 * PREVIEW MODE — run the whole UI with zero backend, zero database, zero keys.
 *
 * Why this exists
 * ---------------
 * The React app normally talks to the Express API (which reads MongoDB and calls
 * Gemini). To let you *look at the UI* without setting any of that up, we can flip
 * the app into "preview mode": every network call is intercepted here and answered
 * with realistic, hand-written fixtures that match the real API response shapes
 * exactly. Nothing here touches the network.
 *
 * How it turns on
 * ---------------
 * Vite injects env vars prefixed with VITE_. When you start the client with the
 * "preview" mode (npm run dev:mock → `vite --mode preview`), Vite loads
 * `.env.preview`, which sets VITE_PREVIEW=1. `PREVIEW` below reads that flag.
 * In normal `npm run dev` the flag is absent, so this module is inert and the app
 * hits the real backend as usual.
 *
 * Where it's wired
 * ----------------
 *   - lib/api.js       → api.get/api.post delegate here when PREVIEW is on
 *   - hooks/useSSE.js  → streamSSE() delegates to previewStream() when PREVIEW is on
 *   - context/AuthContext.jsx → auto-signs-in a fake user so gated pages render
 *
 * Everything below is FAKE sample data for a UI walkthrough. It is never used in a
 * real build. See docs/UI_PREVIEW.md for the full explanation.
 */

// import.meta.env is always defined under Vite; optional-chain for safety elsewhere.
export const PREVIEW =
  import.meta.env?.VITE_PREVIEW === '1' || import.meta.env?.VITE_PREVIEW === 'true';

/* A fake signed-in user so Protected routes (Dashboard, Interview) render and the
 * Run/Submit/Hint buttons (which are disabled when logged out) are enabled. */
export const PREVIEW_USER = { id: 'preview-user', name: 'Preview User', email: 'demo@codesage.dev' };
export const PREVIEW_TOKEN = 'preview-token-not-a-real-jwt';

/* ------------------------------------------------------------------ *
 * Fixtures — the 5 seeded problems, mirrored so browsing feels real. *
 * ------------------------------------------------------------------ */

const PROBLEMS = [
  {
    slug: 'two-sum-sorted',
    title: 'Two Sum II — Sorted Array',
    difficulty: 'Easy',
    topics: ['Arrays', 'Two Pointers', 'Hashing'],
    companies: ['Amazon', 'Google', 'Microsoft'],
    timeLimitMs: 4000,
    statement: [
      'You are given a **1-indexed**, non-decreasing array of integers `nums` and a target value `target`.',
      '',
      'Return the two 1-based indices `i` and `j` (with `i < j`) of the two numbers such that `nums[i] + nums[j] == target`.',
      'Each input has **exactly one** solution, and you may not use the same element twice.',
      '',
      '**Input**',
      '```',
      'n target',
      'nums[0] nums[1] ... nums[n-1]   (sorted ascending)',
      '```',
      '**Output**: the two indices, space-separated, smaller first.',
    ].join('\n'),
    constraints: '`2 ≤ n ≤ 10^4`, `-10^9 ≤ nums[i] ≤ 10^9`, array sorted ascending, exactly one solution.',
    examples: [
      { input: '4 9\n2 7 11 15', output: '1 2', explanation: 'nums[1] + nums[2] = 2 + 7 = 9.' },
      { input: '3 6\n1 2 4', output: '2 3', explanation: 'nums[2] + nums[3] = 2 + 4 = 6.' },
    ],
    starterCode: {
      python: `import sys

def two_sum(nums, target):
    # TODO: use two pointers from both ends; return 1-based [i, j]
    return [0, 0]

def main():
    data = sys.stdin.read().split()
    n, target = int(data[0]), int(data[1])
    nums = list(map(int, data[2:2 + n]))
    i, j = two_sum(nums, target)
    print(i, j)

main()
`,
      javascript: `function twoSum(nums, target) {
  // TODO: use two pointers from both ends; return 1-based [i, j]
  return [0, 0];
}

const data = require('fs').readFileSync(0, 'utf8').trim().split(/\\s+/).map(Number);
const n = data[0], target = data[1];
const nums = data.slice(2, 2 + n);
const [i, j] = twoSum(nums, target);
console.log(i, j);
`,
      cpp: `#include <bits/stdc++.h>
using namespace std;

pair<int,int> twoSum(vector<long long>& nums, long long target) {
    return {0, 0};
}

int main() {
    int n; long long target;
    cin >> n >> target;
    vector<long long> nums(n);
    for (int i = 0; i < n; i++) cin >> nums[i];
    auto [i, j] = twoSum(nums, target);
    cout << i << " " << j << "\\n";
}
`,
      java: `import java.util.*;

public class Main {
    static int[] twoSum(long[] nums, long target) {
        return new int[]{0, 0};
    }

    public static void main(String[] args) {
        Scanner sc = new Scanner(System.in);
        int n = sc.nextInt();
        long target = sc.nextLong();
        long[] nums = new long[n];
        for (int i = 0; i < n; i++) nums[i] = sc.nextLong();
        int[] r = twoSum(nums, target);
        System.out.println(r[0] + " " + r[1]);
    }
}
`,
    },
    editorial: [
      '## Two Sum II — Two Pointers',
      '',
      'Because the array is **sorted**, we can avoid the O(n²) brute force and the O(n) extra space of a hash map.',
      '',
      '**Idea**: put one pointer at the start (`lo`) and one at the end (`hi`). Look at `nums[lo] + nums[hi]`:',
      '- if it equals the target, we are done;',
      '- if it is **too small**, move `lo` right to grow the sum;',
      '- if it is **too large**, move `hi` left.',
      '',
      'Each element is visited at most once → **O(n)** time, **O(1)** space.',
    ].join('\n'),
  },
  {
    slug: 'valid-parentheses',
    title: 'Valid Parentheses',
    difficulty: 'Easy',
    topics: ['Stack', 'Strings'],
    companies: ['Amazon', 'Meta', 'Bloomberg'],
    timeLimitMs: 4000,
    statement: [
      'Given a string `s` containing just the characters `()[]{}`, determine if the input string is **valid**.',
      '',
      'A string is valid if open brackets are closed by the **same type** of bracket and in the **correct order**.',
      '',
      '**Input**: a single line — the string `s` (no spaces).',
      '',
      '**Output**: `YES` if valid, otherwise `NO`.',
    ].join('\n'),
    constraints: '`1 ≤ |s| ≤ 10^4`, `s` consists only of the characters `()[]{}`.',
    examples: [
      { input: '()', output: 'YES', explanation: 'A single matched pair.' },
      { input: '([)]', output: 'NO', explanation: 'Brackets close in the wrong order.' },
    ],
    starterCode: {
      python: `import sys

def is_valid(s):
    # TODO: push opens onto a stack; on a close, the top must be the match
    return False

def main():
    s = sys.stdin.readline().strip()
    print("YES" if is_valid(s) else "NO")

main()
`,
      javascript: `function isValid(s) {
  // TODO: push opens onto a stack; on a close, the top must be the match
  return false;
}

const s = require('fs').readFileSync(0, 'utf8').split('\\n')[0].trim();
console.log(isValid(s) ? "YES" : "NO");
`,
      cpp: `#include <bits/stdc++.h>
using namespace std;

bool isValid(const string& s) {
    // TODO: push opens onto a stack; on a close, the top must be the match
    return false;
}

int main() {
    string s;
    getline(cin, s);
    cout << (isValid(s) ? "YES" : "NO") << "\\n";
}
`,
      java: `import java.util.*;

public class Main {
    static boolean isValid(String s) {
        // TODO: push opens onto a stack; on a close, the top must be the match
        return false;
    }

    public static void main(String[] args) {
        Scanner sc = new Scanner(System.in);
        String s = sc.hasNextLine() ? sc.nextLine().trim() : "";
        System.out.println(isValid(s) ? "YES" : "NO");
    }
}
`,
    },
    editorial: [
      '## Valid Parentheses — Stack',
      '',
      'The canonical **stack** problem. Scan left to right: push openers; on a closer, the top of the stack must be the matching opener, else the string is invalid. At the end the stack must be empty.',
      '',
      '**Complexity**: O(n) time, O(n) space. The stack captures the LIFO "most recently opened, must close first" structure exactly.',
    ].join('\n'),
  },
  {
    slug: 'binary-search',
    title: 'Binary Search',
    difficulty: 'Easy',
    topics: ['Binary Search', 'Arrays'],
    companies: ['Google', 'Microsoft'],
    timeLimitMs: 4000,
    statement: [
      'Given a sorted (ascending) array `nums` of distinct integers and a `target`, return the **0-based index** of `target` in `nums`, or `-1` if it is not present.',
      '',
      'You must write an algorithm with **O(log n)** runtime.',
      '',
      '**Input**',
      '```',
      'n target',
      'nums[0] nums[1] ... nums[n-1]',
      '```',
      '**Output**: the index of `target`, or `-1`.',
    ].join('\n'),
    constraints: '`1 ≤ n ≤ 10^4`, `-10^9 ≤ nums[i], target ≤ 10^9`, all distinct and sorted ascending.',
    examples: [
      { input: '6 9\n-1 0 3 5 9 12', output: '4', explanation: '9 is at index 4.' },
      { input: '6 2\n-1 0 3 5 9 12', output: '-1', explanation: '2 is not in the array.' },
    ],
    starterCode: {
      python: `import sys

def search(nums, target):
    # TODO: classic binary search; return index or -1
    return -1

def main():
    data = sys.stdin.read().split()
    n, target = int(data[0]), int(data[1])
    nums = list(map(int, data[2:2 + n]))
    print(search(nums, target))

main()
`,
      javascript: `function search(nums, target) {
  // TODO: classic binary search; return index or -1
  return -1;
}

const data = require('fs').readFileSync(0, 'utf8').trim().split(/\\s+/).map(Number);
const n = data[0], target = data[1];
const nums = data.slice(2, 2 + n);
console.log(search(nums, target));
`,
      cpp: `#include <bits/stdc++.h>
using namespace std;

int search(vector<long long>& nums, long long target) {
    // TODO: classic binary search; return index or -1
    return -1;
}

int main() {
    int n; long long target;
    cin >> n >> target;
    vector<long long> nums(n);
    for (int i = 0; i < n; i++) cin >> nums[i];
    cout << search(nums, target) << "\\n";
}
`,
      java: `import java.util.*;

public class Main {
    static int search(long[] nums, long target) {
        // TODO: classic binary search; return index or -1
        return -1;
    }

    public static void main(String[] args) {
        Scanner sc = new Scanner(System.in);
        int n = sc.nextInt();
        long target = sc.nextLong();
        long[] nums = new long[n];
        for (int i = 0; i < n; i++) nums[i] = sc.nextLong();
        System.out.println(search(nums, target));
    }
}
`,
    },
    editorial: [
      '## Binary Search',
      '',
      'Maintain a closed interval `[lo, hi]`. Compare the middle to the target and discard half each step, so the loop runs O(log n) times.',
      '',
      '**Interview pitfalls**: use `lo + (hi - lo) // 2` to avoid overflow, and stay consistent about closed `[lo, hi]` vs half-open `[lo, hi)` — mixing them is the #1 off-by-one source.',
    ].join('\n'),
  },
  {
    slug: 'maximum-subarray',
    title: 'Maximum Subarray',
    difficulty: 'Medium',
    topics: ['Dynamic Programming', 'Arrays', 'Divide and Conquer'],
    companies: ['Amazon', 'Microsoft', 'LinkedIn'],
    timeLimitMs: 4000,
    statement: [
      'Given an integer array `nums`, find the **contiguous** subarray (containing at least one number) with the largest sum, and return that sum.',
      '',
      '**Input**',
      '```',
      'n',
      'nums[0] nums[1] ... nums[n-1]',
      '```',
      '**Output**: the maximum subarray sum.',
    ].join('\n'),
    constraints: '`1 ≤ n ≤ 10^5`, `-10^4 ≤ nums[i] ≤ 10^4`.',
    examples: [
      { input: '9\n-2 1 -3 4 -1 2 1 -5 4', output: '6', explanation: 'The subarray [4,-1,2,1] has sum 6.' },
      { input: '1\n1', output: '1', explanation: 'Single element.' },
    ],
    starterCode: {
      python: `import sys

def max_subarray(nums):
    # TODO: Kadane's algorithm — track best ending here vs. best overall
    return 0

def main():
    data = sys.stdin.read().split()
    n = int(data[0])
    nums = list(map(int, data[1:1 + n]))
    print(max_subarray(nums))

main()
`,
      javascript: `function maxSubarray(nums) {
  // TODO: Kadane's algorithm — track best ending here vs. best overall
  return 0;
}

const data = require('fs').readFileSync(0, 'utf8').trim().split(/\\s+/).map(Number);
const n = data[0];
const nums = data.slice(1, 1 + n);
console.log(maxSubarray(nums));
`,
      cpp: `#include <bits/stdc++.h>
using namespace std;

long long maxSubarray(vector<long long>& nums) {
    // TODO: Kadane's algorithm — track best ending here vs. best overall
    return 0;
}

int main() {
    int n; cin >> n;
    vector<long long> nums(n);
    for (int i = 0; i < n; i++) cin >> nums[i];
    cout << maxSubarray(nums) << "\\n";
}
`,
      java: `import java.util.*;

public class Main {
    static long maxSubarray(long[] nums) {
        // TODO: Kadane's algorithm — track best ending here vs. best overall
        return 0;
    }

    public static void main(String[] args) {
        Scanner sc = new Scanner(System.in);
        int n = sc.nextInt();
        long[] nums = new long[n];
        for (int i = 0; i < n; i++) nums[i] = sc.nextLong();
        System.out.println(maxSubarray(nums));
    }
}
`,
    },
    editorial: [
      "## Maximum Subarray — Kadane's Algorithm",
      '',
      'Let `best_ending_here` be the largest sum of a subarray ending at the current index. At each element `x` you either extend or restart: `best_ending_here = max(x, best_ending_here + x)`. The answer is the max over all indices.',
      '',
      '**Complexity**: O(n) time, O(1) space — a 1-D DP where the state is "best subarray ending here".',
    ].join('\n'),
  },
  {
    slug: 'trapping-rain-water',
    title: 'Trapping Rain Water',
    difficulty: 'Hard',
    topics: ['Two Pointers', 'Dynamic Programming', 'Stack'],
    companies: ['Amazon', 'Google', 'Goldman Sachs'],
    timeLimitMs: 4000,
    statement: [
      'Given `n` non-negative integers representing an elevation map where the width of each bar is `1`, compute how much water it can trap after raining.',
      '',
      '**Input**',
      '```',
      'n',
      'height[0] height[1] ... height[n-1]',
      '```',
      '**Output**: the total units of trapped water.',
    ].join('\n'),
    constraints: '`1 ≤ n ≤ 2·10^4`, `0 ≤ height[i] ≤ 10^5`.',
    examples: [
      { input: '12\n0 1 0 2 1 0 1 3 2 1 2 1', output: '6', explanation: 'The classic elevation map traps 6 units.' },
      { input: '6\n4 2 0 3 2 5', output: '9', explanation: 'Traps 9 units of water.' },
    ],
    starterCode: {
      python: `import sys

def trap(height):
    # TODO: two pointers; water at i = min(maxLeft, maxRight) - height[i]
    return 0

def main():
    data = sys.stdin.read().split()
    n = int(data[0])
    height = list(map(int, data[1:1 + n]))
    print(trap(height))

main()
`,
      javascript: `function trap(height) {
  // TODO: two pointers; water at i = min(maxLeft, maxRight) - height[i]
  return 0;
}

const data = require('fs').readFileSync(0, 'utf8').trim().split(/\\s+/).map(Number);
const n = data[0];
const height = data.slice(1, 1 + n);
console.log(trap(height));
`,
      cpp: `#include <bits/stdc++.h>
using namespace std;

long long trap(vector<long long>& height) {
    // TODO: two pointers; water at i = min(maxLeft, maxRight) - height[i]
    return 0;
}

int main() {
    int n; cin >> n;
    vector<long long> height(n);
    for (int i = 0; i < n; i++) cin >> height[i];
    cout << trap(height) << "\\n";
}
`,
      java: `import java.util.*;

public class Main {
    static long trap(long[] height) {
        // TODO: two pointers; water at i = min(maxLeft, maxRight) - height[i]
        return 0;
    }

    public static void main(String[] args) {
        Scanner sc = new Scanner(System.in);
        int n = sc.nextInt();
        long[] height = new long[n];
        for (int i = 0; i < n; i++) height[i] = sc.nextLong();
        System.out.println(trap(height));
    }
}
`,
    },
    editorial: [
      '## Trapping Rain Water — Two Pointers',
      '',
      'Water on bar `i` is `min(maxLeft[i], maxRight[i]) - height[i]`. The elegant O(1)-space solution walks two pointers inward, always advancing the side with the **smaller** running max (that side is the bottleneck, so its water level is fully determined).',
      '',
      '**Complexity**: O(n) time, O(1) space. Follow-ups: the O(n)-space prefix/suffix-max version, and a monotonic-stack version.',
    ].join('\n'),
  },
];

const HIDDEN_COUNTS = {
  'two-sum-sorted': 3,
  'valid-parentheses': 4,
  'binary-search': 4,
  'maximum-subarray': 4,
  'trapping-rain-water': 4,
};

/* ------------------------------------------------------------------ *
 * Helpers                                                            *
 * ------------------------------------------------------------------ */

const delay = (ms) => new Promise((r) => setTimeout(r, ms));

/** Trim the leading "/api" is already stripped by the caller; we get e.g. "/problems?..". */
function parse(path) {
  const [p, qs = ''] = path.split('?');
  return { p, params: new URLSearchParams(qs) };
}

/** Build a run/submit result. `full` = submit (adds hidden tests). */
function makeResult(slug, full) {
  const hidden = HIDDEN_COUNTS[slug] ?? 4;
  const testResults = [
    { index: 0, passed: true, timeMs: 21, isHidden: false, stderr: '' },
    { index: 1, passed: true, timeMs: 18, isHidden: false, stderr: '' },
  ];
  if (full) {
    for (let i = 0; i < hidden; i++) {
      testResults.push({ index: 2 + i, passed: true, timeMs: 15 + i, isHidden: true, stderr: '' });
    }
  }
  return {
    verdict: 'AC',
    passedCount: testResults.length,
    totalCount: testResults.length,
    runtimeMs: testResults.reduce((a, t) => a + t.timeMs, 0),
    testResults,
    compileOutput: '',
  };
}

/* ------------------------------------------------------------------ *
 * GET handler                                                        *
 * ------------------------------------------------------------------ */

export async function previewGet(path) {
  await delay(180); // tiny latency so spinners are visible
  const { p, params } = parse(path);

  if (p === '/problems') {
    const difficulty = params.get('difficulty') || '';
    const search = (params.get('search') || '').toLowerCase();
    let items = PROBLEMS.map((x) => ({
      slug: x.slug, title: x.title, difficulty: x.difficulty, topics: x.topics, companies: x.companies,
    }));
    if (difficulty) items = items.filter((x) => x.difficulty === difficulty);
    if (search) items = items.filter((x) => x.title.toLowerCase().includes(search));
    return { items, total: items.length, page: 1, limit: 20 };
  }

  if (p.startsWith('/problems/')) {
    const slug = p.slice('/problems/'.length);
    const prob = PROBLEMS.find((x) => x.slug === slug);
    if (!prob) throw new Error('Problem not found');
    return { ...prob, testCases: [], hiddenTestCount: HIDDEN_COUNTS[slug] ?? 4 };
  }

  if (p === '/me/stats') {
    const now = Date.now();
    const day = 86400000;
    return {
      solvedByDifficulty: { Easy: 3, Medium: 2, Hard: 1 },
      totalSolved: 6,
      verdicts: { AC: 9, WA: 3, TLE: 1 },
      totalSubmissions: 13,
      acceptanceRate: 69,
      readinessScore: 62,
      recentSubmissions: [
        { problem: { slug: 'trapping-rain-water', title: 'Trapping Rain Water', difficulty: 'Hard' }, verdict: 'AC', createdAt: new Date(now - day * 0.2).toISOString() },
        { problem: { slug: 'maximum-subarray', title: 'Maximum Subarray', difficulty: 'Medium' }, verdict: 'AC', createdAt: new Date(now - day * 1).toISOString() },
        { problem: { slug: 'binary-search', title: 'Binary Search', difficulty: 'Easy' }, verdict: 'WA', createdAt: new Date(now - day * 1.1).toISOString() },
        { problem: { slug: 'valid-parentheses', title: 'Valid Parentheses', difficulty: 'Easy' }, verdict: 'AC', createdAt: new Date(now - day * 2).toISOString() },
        { problem: { slug: 'two-sum-sorted', title: 'Two Sum II — Sorted Array', difficulty: 'Easy' }, verdict: 'AC', createdAt: new Date(now - day * 3).toISOString() },
      ],
    };
  }

  throw new Error(`Preview: no mock for GET ${path}`);
}

/* ------------------------------------------------------------------ *
 * POST handler                                                       *
 * ------------------------------------------------------------------ */

export async function previewPost(path, body = {}) {
  await delay(260);
  const { p } = parse(path);

  if (p === '/auth/login' || p === '/auth/register') {
    return { token: PREVIEW_TOKEN, user: { ...PREVIEW_USER, name: body.name || PREVIEW_USER.name, email: body.email || PREVIEW_USER.email } };
  }

  if (p === '/run') {
    return { ...makeResult(body.problemSlug, false), saved: false };
  }

  if (p === '/submissions') {
    return { submissionId: 'preview-sub-1', ...makeResult(body.problemSlug, true) };
  }

  if (p.startsWith('/ai/review/')) {
    return {
      review: {
        groundedVerdict: 'AC',
        timeComplexity: 'O(n)',
        spaceComplexity: 'O(1)',
        codeQualityScore: 8,
        strengths: [
          'Clean two-pointer loop with a clear invariant.',
          'Handles the empty and single-element inputs without special-casing.',
        ],
        improvements: [
          'Name the pointers `lo`/`hi` for readability.',
          'Add a one-line comment stating why advancing the smaller side is safe.',
        ],
        edgeCasesMissed: [
          'Very large values near the constraint bound (watch for overflow in C++/Java).',
        ],
      },
    };
  }

  if (p === '/ai/ask') {
    const q = (body.question || 'this concept').trim();
    return {
      grounded: true,
      answer: [
        `### ${q}`,
        '',
        'Great question. Here is the short version, grounded in the notes below.',
        '',
        '- **Use it when** you need the previous smaller/greater element, or a running boundary you can pop in amortized O(1).',
        '- **Why it works**: each element is pushed and popped at most once, so a full scan is **O(n)** even though it looks nested.',
        '- **Tell-tale signs** in a prompt: "next greater", "largest rectangle", "daily temperatures", or "trapped water".',
        '',
        '> This answer is stitched from the retrieved sources cited below (preview mode uses canned retrieval).',
      ].join('\n'),
      sources: [
        { n: 1, title: 'Concept: Monotonic Stack', source: 'notes/monotonic-stack', score: 0.842, preview: 'A monotonic stack keeps elements in sorted order so the next-greater/next-smaller query is answered as you pop' },
        { n: 2, title: 'Editorial: Trapping Rain Water', source: 'editorial/trapping-rain-water', score: 0.791, preview: 'Water on bar i is min(maxLeft, maxRight) minus height[i]; a stack accumulates water in horizontal layers' },
        { n: 3, title: 'Concept: Big-O Analysis', source: 'notes/big-o', score: 0.688, preview: 'Amortized analysis explains why a push/pop-once scan is linear despite an inner loop' },
      ],
    };
  }

  if (p.endsWith('/finish')) {
    return {
      evaluation: {
        problemSolving: 8,
        communication: 7,
        codeQuality: 8,
        overall: 8,
        notes: 'Strong structured approach: you clarified constraints, stated the brute force, then optimized to two pointers with a correct invariant. To push from good to great, verbalize complexity earlier and walk one concrete example end-to-end before coding.',
      },
    };
  }

  throw new Error(`Preview: no mock for POST ${path}`);
}

/* ------------------------------------------------------------------ *
 * SSE simulation — streams canned text token-by-token.               *
 * ------------------------------------------------------------------ */

async function streamText(text, onChunk) {
  // Split into word-ish tokens so it visibly "types" like the real stream.
  const tokens = text.match(/\S+\s*/g) || [text];
  for (const tok of tokens) {
    onChunk?.(tok);
    await delay(28);
  }
}

const HINTS = {
  1: "Let's start high level. What does the **sorted** property let you avoid? Think about what a brute-force pair check costs, and whether the ordering gives you a cheaper way to decide which element to move next. (No code yet — just the idea.)",
  2: 'Consider two pointers, one at each end. Look at the sum of the endpoints: if it overshoots the target, which pointer should move, and in which direction? If it undershoots? Convince yourself each move never skips a valid answer.',
  3: "Concretely: keep `lo = 0`, `hi = n-1`. While `lo < hi`, compare `nums[lo] + nums[hi]` to target — equal ⇒ done; too small ⇒ `lo++`; too large ⇒ `hi--`. That's O(n) time, O(1) space. Try to code just that loop.",
};

export async function previewStream(path, body = {}, handlers = {}) {
  const { onChunk, onEvent, onDone, onError } = handlers;
  try {
    const { p } = parse(path);
    await delay(150);

    if (p === '/ai/hint') {
      const level = Number(body.level) || 1;
      await streamText(HINTS[level] || HINTS[1], onChunk);
      onDone?.({});
      return;
    }

    if (p === '/interviews') {
      // First the server would announce the session id, then stream the opener.
      onEvent?.('session', { sessionId: 'preview-session-1' });
      await delay(120);
      await streamText(
        "Hi, thanks for joining. Let's do a mock interview on this problem. " +
        "Before writing any code, walk me through your understanding: what are the inputs and outputs, " +
        "and what's the most brute-force approach you can think of? We'll optimize from there.",
        onChunk,
      );
      onDone?.({});
      return;
    }

    if (p.endsWith('/message')) {
      await streamText(
        'Good — that brute force is O(n²). Now, the array is sorted; can you use that to do better? ' +
        'Tell me what a pair of pointers at the two ends would let you decide at each step, and what the ' +
        'resulting time and space complexity would be.',
        onChunk,
      );
      onDone?.({});
      return;
    }

    onError?.(`Preview: no mock stream for ${path}`);
  } catch (e) {
    onError?.(e.message || 'Preview stream error');
  }
}
