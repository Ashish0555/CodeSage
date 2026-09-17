/**
 * Standalone concept notes for the RAG knowledge base (the "Tutor").
 *
 * These are ingested (chunked + embedded) by the seed script IN ADDITION to
 * each problem's editorial. They give the tutor grounded material to cite when
 * a user asks a conceptual question ("when do I use a monotonic stack?").
 *
 * Keep each note focused and self-contained — good retrieval depends on each
 * chunk making sense on its own.
 */

export const conceptNotes = [
  {
    title: 'Two Pointers: when and why',
    source: 'concepts/two-pointers',
    topics: ['Two Pointers', 'Arrays'],
    companies: [],
    text: [
      'The two-pointer technique uses two indices that move through a sequence to replace a nested loop with a single pass.',
      '',
      'Use it when: (1) the array is sorted and you are looking for a pair/triplet with a target property (e.g. Two Sum II, 3Sum); (2) you are shrinking/growing a window (sliding window is a two-pointer variant); (3) you are comparing from both ends (palindrome check, container with most water, trapping rain water).',
      '',
      'The core reason it works on sorted data: moving a pointer monotonically changes the quantity you care about (a running sum, a width, a max), so you never need to reconsider positions you have passed. This turns O(n^2) brute force into O(n).',
      '',
      'Common pitfalls: forgetting to handle duplicates (skip equal neighbors in 3Sum), moving the wrong pointer, and off-by-one errors in the loop condition (lo < hi vs lo <= hi).',
    ].join('\n'),
  },
  {
    title: 'Binary Search templates and invariants',
    source: 'concepts/binary-search',
    topics: ['Binary Search'],
    companies: [],
    text: [
      'Binary search works on any monotonic predicate, not just sorted arrays. If you can phrase the problem as "find the smallest x such that check(x) is true", and check is monotonic (false...false, true...true), you can binary search on the answer.',
      '',
      'Two things prevent 90% of bugs: (1) fix your interval convention and never mix it — closed [lo, hi] uses while lo <= hi and moves lo = mid+1 / hi = mid-1; half-open [lo, hi) uses while lo < hi and hi = mid. (2) compute mid as lo + (hi - lo) // 2 to avoid integer overflow in C++/Java.',
      '',
      'Classic applications beyond plain lookup: lower_bound / upper_bound, search in rotated sorted array, find peak element, and "binary search on the answer" problems like Koko eating bananas, split array largest sum, and capacity to ship packages within D days.',
    ].join('\n'),
  },
  {
    title: 'Dynamic Programming: recognizing it',
    source: 'concepts/dynamic-programming',
    topics: ['Dynamic Programming'],
    companies: [],
    text: [
      'Dynamic programming applies when a problem has (1) optimal substructure — the optimal answer is built from optimal answers to subproblems — and (2) overlapping subproblems — the same subproblems recur, so caching helps.',
      '',
      'A reliable recipe: define the state (what parameters uniquely identify a subproblem), write the recurrence (how a state depends on smaller states), identify base cases, and decide an evaluation order (top-down memoized recursion, or bottom-up tabulation).',
      '',
      'Kadane\'s algorithm for maximum subarray is a minimal 1-D DP: state = best subarray sum ending at index i, recurrence = max(nums[i], dp[i-1] + nums[i]). Because dp[i] only needs dp[i-1], we collapse the table to O(1) space. Recognizing that "the DP table only depends on the previous row/value" is the standard space-optimization move (also used in 0/1 knapsack and edit distance).',
      '',
      'Interview tip: always state the state and recurrence out loud before coding. Interviewers score the derivation, not just the final code.',
    ].join('\n'),
  },
  {
    title: 'Stacks and monotonic stacks',
    source: 'concepts/monotonic-stack',
    topics: ['Stack'],
    companies: [],
    text: [
      'A stack (LIFO) is the right tool whenever the most recently seen item must be resolved first: matching parentheses, evaluating expressions, undo history, and DFS.',
      '',
      'A monotonic stack keeps its elements in sorted (increasing or decreasing) order by popping violators before pushing. It answers "next greater / next smaller element" style questions in O(n) total, because each element is pushed and popped at most once (amortized O(1) per element).',
      '',
      'Signals that a monotonic stack fits: you are asked for the nearest larger/smaller value to the left or right, the largest rectangle in a histogram, the span of stock prices, or a layer-by-layer accumulation like trapping rain water. The trick is deciding whether the stack should be increasing or decreasing, and whether you store values or indices (usually indices, so you can compute widths).',
    ].join('\n'),
  },
  {
    title: 'Big-O and complexity analysis',
    source: 'concepts/big-o',
    topics: ['Complexity'],
    companies: [],
    text: [
      'Big-O describes how running time or space grows as input size n grows, ignoring constants and lower-order terms. It is an upper bound on the growth rate.',
      '',
      'Use the constraints to guess the intended complexity: n <= 20 suggests exponential/backtracking (2^n or n!); n <= 500 suggests O(n^3); n <= 5000 suggests O(n^2); n <= 10^6 suggests O(n log n) or O(n); n <= 10^18 suggests O(log n) or O(1). This mapping is one of the most practical interview heuristics.',
      '',
      'Amortized analysis matters: a dynamic array push is O(1) amortized even though an occasional resize is O(n); a monotonic stack pass is O(n) overall even though a single step may pop many items. Explain amortization explicitly when it applies — it shows depth.',
      '',
      'Note that in CodeSage the AI review reports complexity as an ESTIMATE. The deterministic judge decides correctness; complexity is a heuristic the model infers from the code, so treat it as a study aid, not a proof.',
    ].join('\n'),
  },
  {
    title: 'Behavioral: STAR method for interviews',
    source: 'concepts/behavioral-star',
    topics: ['Behavioral'],
    companies: [],
    text: [
      'For behavioral interview questions, structure answers with STAR: Situation (context), Task (your responsibility), Action (what you specifically did), Result (measurable outcome).',
      '',
      'Keep the Situation and Task brief (about 20% of the answer) and spend most of the time on Action and Result. Use "I" rather than "we" when describing your contribution, and quantify the result whenever possible (latency reduced by 30%, 3 bugs prevented, shipped 2 days early).',
      '',
      'Prepare 4-6 stories that can flex across common prompts: a conflict, a failure you learned from, a time you took initiative, and a technically hard problem you solved. Map each to the company\'s values before the interview.',
    ].join('\n'),
  },
];

export default conceptNotes;
