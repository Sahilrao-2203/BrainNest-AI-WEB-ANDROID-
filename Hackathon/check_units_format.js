import fs from 'fs';

const content = fs.readFileSync('C:\\Users\\ANTRA\\Desktop\\Hackathon\\sem3_dump.txt', 'utf-8');

// Find all occurrences of "Unit" (case insensitive) and print their surrounding context
const regex = /.{0,30}unit.{0,50}/gi;
let match;
let count = 0;
while ((match = regex.exec(content)) !== null && count < 20) {
  console.log(match[0].replace(/\n/g, ' '));
  count++;
}
