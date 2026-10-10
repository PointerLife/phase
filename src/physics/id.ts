let counter = 0;

/** Short, collision-resistant enough id for in-session entities. */
export function makeId(prefix = 'b'): string {
  counter += 1;
  return `${prefix}${Date.now().toString(36)}${counter.toString(36)}`;
}
