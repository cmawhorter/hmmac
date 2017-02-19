export default function(a, b) {
  let diff = a.length ^ b.length;
  for (let i = 0; i < a.length && i < b.length; i++) {
    diff |= a[i] ^ b[i];
  }
  return 0 === diff;
}
