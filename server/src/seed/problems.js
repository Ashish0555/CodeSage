/**
 * Curated problem set for CodeSage.
 *
 * IMPORTANT — the judge is stdin/stdout based (see execService.js). Each test
 * case supplies `input` on stdin; the program must print the expected answer to
 * stdout. `expectedOutput` is compared after normalization (trailing whitespace
 * and blank lines are ignored), so a trailing newline from print() is fine.
 *
 * `starterCode` wires up the I/O plumbing for all four languages and leaves the
 * algorithm as a clearly marked TODO — candidates focus on the algorithm, not
 * on parsing. Full reference solutions live in each `editorial` (which is also
 * chunked into the RAG knowledge base by the seed script).
 *
 * Every `expectedOutput` below was hand-computed and cross-checked; the values
 * for the classic problems (Max Subarray = 6, Trapping Rain Water = 6/9, Edit
 * Distance horse→ros = 3, etc.) match their well-known canonical answers.
 */

export const problems = [
  /* ============================ 1) Two Sum II ============================ */
  {
    slug: 'two-sum-sorted',
    title: 'Two Sum II — Sorted Array',
    difficulty: 'Easy',
    topics: ['Arrays', 'Two Pointers', 'Hashing'],
    companies: ['Amazon', 'Google', 'Microsoft'],
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
    testCases: [
      { input: '4 9\n2 7 11 15', expectedOutput: '1 2', isHidden: false },
      { input: '3 6\n1 2 4', expectedOutput: '2 3', isHidden: false },
      { input: '5 13\n1 3 4 6 9', expectedOutput: '3 5', isHidden: true },
      { input: '2 3\n1 2', expectedOutput: '1 2', isHidden: true },
      { input: '6 11\n2 3 4 5 8 11', expectedOutput: '2 5', isHidden: true },
    ],
    timeLimitMs: 4000,
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

// TODO: return 1-based indices {i, j}
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
    // TODO: return 1-based indices {i, j}
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
      '- if it is **too small**, the only way to grow the sum is to move `lo` right;',
      '- if it is **too large**, move `hi` left.',
      '',
      'Each element is visited at most once, so the scan is **O(n)** time and **O(1)** space.',
      '',
      '```python',
      'def two_sum(nums, target):',
      '    lo, hi = 0, len(nums) - 1',
      '    while lo < hi:',
      '        s = nums[lo] + nums[hi]',
      '        if s == target:',
      '            return [lo + 1, hi + 1]   # 1-based',
      '        if s < target:',
      '            lo += 1',
      '        else:',
      '            hi -= 1',
      '    return [-1, -1]',
      '```',
      '',
      '**Why it is correct**: moving the pointer never skips a valid answer — if `nums[lo]+nums[hi]` is too small, `nums[lo]` cannot pair with anything smaller than `nums[hi]`, so `lo` is safe to advance (symmetric argument for `hi`).',
    ].join('\n'),
  },

  /* ========================= 2) Valid Parentheses ========================= */
  {
    slug: 'valid-parentheses',
    title: 'Valid Parentheses',
    difficulty: 'Easy',
    topics: ['Stack', 'Strings'],
    companies: ['Amazon', 'Meta', 'Bloomberg'],
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
    testCases: [
      { input: '()', expectedOutput: 'YES', isHidden: false },
      { input: '([)]', expectedOutput: 'NO', isHidden: false },
      { input: '()[]{}', expectedOutput: 'YES', isHidden: true },
      { input: '(]', expectedOutput: 'NO', isHidden: true },
      { input: '{[]}', expectedOutput: 'YES', isHidden: true },
      { input: '(((', expectedOutput: 'NO', isHidden: true },
    ],
    timeLimitMs: 4000,
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
      'This is the canonical **stack** problem. Scan left to right:',
      '- on an **opening** bracket, push it;',
      '- on a **closing** bracket, the top of the stack must be the matching opener — otherwise the string is invalid.',
      '',
      'At the end the stack must be empty (no unclosed openers).',
      '',
      '```python',
      'def is_valid(s):',
      '    pairs = {")": "(", "]": "[", "}": "{"}',
      '    st = []',
      '    for c in s:',
      '        if c in "([{":',
      '            st.append(c)',
      '        else:',
      '            if not st or st.pop() != pairs[c]:',
      '                return False',
      '    return not st',
      '```',
      '',
      '**Complexity**: O(n) time, O(n) space (worst case all openers). The stack captures the "most recently opened, must close first" (LIFO) structure exactly.',
    ].join('\n'),
  },

  /* ======================== 3) Binary Search ======================== */
  {
    slug: 'binary-search',
    title: 'Binary Search',
    difficulty: 'Easy',
    topics: ['Binary Search', 'Arrays'],
    companies: ['Google', 'Microsoft'],
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
    constraints: '`1 ≤ n ≤ 10^4`, `-10^9 ≤ nums[i], target ≤ 10^9`, all `nums[i]` distinct and sorted ascending.',
    examples: [
      { input: '6 9\n-1 0 3 5 9 12', output: '4', explanation: '9 is at index 4.' },
      { input: '6 2\n-1 0 3 5 9 12', output: '-1', explanation: '2 is not in the array.' },
    ],
    testCases: [
      { input: '6 9\n-1 0 3 5 9 12', expectedOutput: '4', isHidden: false },
      { input: '6 2\n-1 0 3 5 9 12', expectedOutput: '-1', isHidden: false },
      { input: '1 5\n5', expectedOutput: '0', isHidden: true },
      { input: '1 3\n5', expectedOutput: '-1', isHidden: true },
      { input: '5 -1\n-5 -3 -1 2 8', expectedOutput: '2', isHidden: true },
      { input: '4 8\n2 4 6 8', expectedOutput: '3', isHidden: true },
    ],
    timeLimitMs: 4000,
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
      'Maintain a closed search interval `[lo, hi]`. Each step, look at the middle:',
      '- if `nums[mid] == target`, return `mid`;',
      '- if `nums[mid] < target`, the answer is in the right half → `lo = mid + 1`;',
      '- else it is in the left half → `hi = mid - 1`.',
      '',
      'The interval **halves** every iteration, so the loop runs O(log n) times.',
      '',
      '```python',
      'def search(nums, target):',
      '    lo, hi = 0, len(nums) - 1',
      '    while lo <= hi:',
      '        mid = (lo + hi) // 2      # in most languages: lo + (hi - lo) // 2',
      '        if nums[mid] == target:',
      '            return mid',
      '        elif nums[mid] < target:',
      '            lo = mid + 1',
      '        else:',
      '            hi = mid - 1',
      '    return -1',
      '```',
      '',
      '**Pitfalls to mention in an interview**: (1) use `lo + (hi - lo) // 2` in C++/Java to avoid integer overflow; (2) be consistent about whether the interval is closed `[lo, hi]` or half-open `[lo, hi)` — mixing them is the #1 source of off-by-one bugs.',
    ].join('\n'),
  },

  /* ==================== 4) Maximum Subarray (Kadane) ==================== */
  {
    slug: 'maximum-subarray',
    title: 'Maximum Subarray',
    difficulty: 'Medium',
    topics: ['Dynamic Programming', 'Arrays', 'Divide and Conquer'],
    companies: ['Amazon', 'Microsoft', 'LinkedIn'],
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
    testCases: [
      { input: '9\n-2 1 -3 4 -1 2 1 -5 4', expectedOutput: '6', isHidden: false },
      { input: '1\n1', expectedOutput: '1', isHidden: false },
      { input: '5\n5 4 -1 7 8', expectedOutput: '23', isHidden: true },
      { input: '3\n-1 -2 -3', expectedOutput: '-1', isHidden: true },
      { input: '4\n-2 -1 -3 -5', expectedOutput: '-1', isHidden: true },
      { input: '6\n-2 -3 4 -1 -2 1', expectedOutput: '4', isHidden: true },
    ],
    timeLimitMs: 4000,
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
      'Let `best_ending_here` be the largest sum of a subarray that **ends at the current index**. There are only two choices at each element `x`: either extend the previous subarray, or start fresh at `x`:',
      '',
      '```',
      'best_ending_here = max(x, best_ending_here + x)',
      '```',
      '',
      'The answer is the maximum `best_ending_here` over all indices. Initialize both to `nums[0]` so that all-negative arrays correctly return the largest single element.',
      '',
      '```python',
      'def max_subarray(nums):',
      '    best = cur = nums[0]',
      '    for x in nums[1:]:',
      '        cur = max(x, cur + x)',
      '        best = max(best, cur)',
      '    return best',
      '```',
      '',
      '**Complexity**: O(n) time, O(1) space. This is a 1-D dynamic program where the state is "best subarray ending here"; the O(1) space comes from only needing the previous value. A divide-and-conquer O(n log n) solution also exists and is a good follow-up discussion.',
    ].join('\n'),
  },

  /* ==================== 5) Trapping Rain Water (Hard) ==================== */
  {
    slug: 'trapping-rain-water',
    title: 'Trapping Rain Water',
    difficulty: 'Hard',
    topics: ['Two Pointers', 'Dynamic Programming', 'Stack'],
    companies: ['Amazon', 'Google', 'Goldman Sachs'],
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
    testCases: [
      { input: '12\n0 1 0 2 1 0 1 3 2 1 2 1', expectedOutput: '6', isHidden: false },
      { input: '6\n4 2 0 3 2 5', expectedOutput: '9', isHidden: false },
      { input: '4\n1 2 3 4', expectedOutput: '0', isHidden: true },
      { input: '4\n4 3 2 1', expectedOutput: '0', isHidden: true },
      { input: '3\n3 0 3', expectedOutput: '3', isHidden: true },
      { input: '1\n5', expectedOutput: '0', isHidden: true },
    ],
    timeLimitMs: 4000,
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
      'The water sitting on top of bar `i` is `min(maxLeft[i], maxRight[i]) - height[i]`, where `maxLeft`/`maxRight` are the tallest bars to the left/right (inclusive). A first solution precomputes those two arrays in O(n) time and O(n) space.',
      '',
      'The elegant optimization uses **two pointers** and O(1) space. Keep `left`/`right` pointers and running `leftMax`/`rightMax`. The key insight: whichever side has the **smaller** running max is the bottleneck, so the water level there is fully determined and we can safely process that side.',
      '',
      '```python',
      'def trap(height):',
      '    left, right = 0, len(height) - 1',
      '    left_max = right_max = 0',
      '    water = 0',
      '    while left < right:',
      '        if height[left] < height[right]:',
      '            left_max = max(left_max, height[left])',
      '            water += left_max - height[left]',
      '            left += 1',
      '        else:',
      '            right_max = max(right_max, height[right])',
      '            water += right_max - height[right]',
      '            right -= 1',
      '    return water',
      '```',
      '',
      '**Complexity**: O(n) time, O(1) space. Interview follow-ups: the O(n)-space prefix/suffix-max version (easier to derive), and a monotonic-stack version that accumulates water in horizontal layers.',
    ].join('\n'),
  },
];

export default problems;
