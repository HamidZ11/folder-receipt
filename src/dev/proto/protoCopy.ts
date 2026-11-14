// Prototype-only strings (copy.ts is frozen during the design phase).
// On promotion, move the chosen direction's lines into src/content/copy.ts.
export const protoCopy = {
  display: { ready: 'Ready', scanning: 'Scanning', files: 'Files', done: 'Printed' },
  labels: { input: 'Input', status: 'Status', output: 'Output' },
  tear: 'Pull to tear off and save',
  picker: ['Thermal', 'Object', 'Editorial'] as const,
};
