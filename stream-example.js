import { Readable } from "stream";
import merge2 from "merge2";

const slowStream = new Readable({
  read() {},
});

slowStream.push("slow stream starting\n");
setTimeout(() => {
  slowStream.push("slow stream finishing\n");
  slowStream.push(null);
});

const fastStream = new Readable({
  read() {},
});
fastStream.push("fast stream starting\n");
fastStream.push("fast stream finishing\n");
fastStream.push(null);

const output = merge2();
output.add(slowStream);
output.add(fastStream);

output.pipe(process.stdout);
