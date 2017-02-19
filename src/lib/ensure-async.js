export default function() {
  let args = Array.from(arguments);
  let fn = args.shift();
  global.setTimeout.apply(global, [
    fn,
    0,
    ...args,
  ]);
}
