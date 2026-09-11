/**
 * Counts words in a title using "spaced word" semantics: split on
 * whitespace, then drop tokens that carry no alphanumeric character
 * (bare punctuation such as a standalone "-"). A token that mixes
 * letters and symbols, e.g. "self-explained", still counts as one
 * word because it is not separated by a space.
 *
 * "This is - a self-explained example" -> 5
 */
export function countWords(title: string): number {
  return title
    .trim()
    .split(/\s+/)
    .filter((token) => /[\p{L}\p{N}]/u.test(token)).length;
}
