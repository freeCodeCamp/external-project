// This file contains the parser for the markdown lessons
import { readFile } from "fs/promises";
import { createReadStream } from "fs";
import { createInterface } from "readline";

const DESCRIPTION_MARKER = "### --description--";
const SEED_MARKER = "### --seed--";
const NEXT_MARKER = `### --`;
const CMD_MARKER = "#### --cmd--";
const FILE_MARKER_REG = '(?<=#### --")[^"]+(?="--)';

/**
 * Reads the first line of the file to get the project name
 * @param {string} file - The relative path to the locale file
 * @returns {Promise<string>} The project name
 */
export async function getProjectTitle(file) {
  const readable = createReadStream(file);
  const reader = createInterface({ input: readable });
  const firstLine = await new Promise((resolve) => {
    reader.on("line", (line) => {
      reader.close();
      resolve(line);
    });
  });
  readable.close();
  const proj = firstLine.replace("# ", "").split(" - ");
  return { projectTopic: proj[0], currentProject: proj[1] };
}

/**
 * Gets all content within a lesson
 * @param {string} file - The relative path to the english locale file
 * @param {number} lessonNumber - The number of the lesson
 * @returns {Promise<string>} The content of the lesson
 */
export async function getLessonFromFile(file, lessonNumber) {
  const fileContent = await readFile(file, "utf8");
  const mat = fileContent.match(
    new RegExp(`## ${lessonNumber}\n(.*?)\n(## ${lessonNumber + 1})?`, "s")
  );
  console.log("mat: ", mat);
  const lesson = mat?.[1];
  return lesson;
}

/**
 * Gets the description of the lesson
 * @param {string} lesson - The lesson content
 * @returns {string} The description of the lesson
 */
export function getLessonDescription(lesson) {
  const description = lesson.match(
    new RegExp(`${DESCRIPTION_MARKER}\n(.*?)\n(?=${NEXT_MARKER})`, "s")
  )?.[1];
  return description;
}

/**
 * Gets the hints and tests of the lesson
 * @param {string} lesson - The lesson content
 * @returns {[string, string]} An array of [hint, test]
 */
export function getLessonHintsAndTests(lesson) {
  const testsString = lesson.trim().split(NEXT_MARKER)?.[2];
  const hintsAndTestsArr = [];
  const hints = testsString?.match(/^(.*?)$(?=\n+```js)/gm).filter(Boolean);
  const tests = testsString.match(/(?<=```js\n).*?(?=\n```)/gms);

  if (hints?.length) {
    for (let i = 0; i < hints.length; i++) {
      hintsAndTestsArr.push([hints[i], tests[i]]);
    }
  }
  return hintsAndTestsArr;
}

/**
 * Gets the seed of the lesson. If none is found, returns `''`.
 * @param {string} lesson - The lesson content
 * @returns {string} The seed of the lesson
 */
export function getLessonSeed(lesson) {
  const seed = lesson.match(new RegExp(`${SEED_MARKER}\n(.*)`, "s"))?.[1];
  return seed ?? "";
}

/**
 * Gets any commands of the lesson seed. If none is found, returns an empty array.
 * @param {string} seed - The seed content
 * @returns {string[]} The commands of the lesson in order
 */
export function getCommands(seed) {
  const cmds = seed.match(new RegExp(`${CMD_MARKER}\n(.*?\`\`\`\n)`, "gs"));
  const commands = cmds?.map((cmd) => extractStringFromCode(cmd)?.trim());
  return commands ?? [];
}

/**
 * Gets any seed for specified files of the lesson seed. If none is found, returns an empty array.
 * @param {string} seed - The seed content
 * @returns {[string, string][]} [[filePath, fileSeed]]
 */
export function getFilesWithSeed(seed) {
  const files = seed.match(
    new RegExp(`#### --"([^"]+)"--\n(.*?\`\`\`\n)`, "gs")
  );
  const filePaths = seed.match(new RegExp(FILE_MARKER_REG, "gsm"));
  const fileSeeds = files?.map((file) => extractStringFromCode(file)?.trim());

  // console.log(filePaths, fileSeeds, files);
  const pathAndSeedArr = [];
  if (filePaths?.length) {
    for (let i = 0; i < filePaths.length; i++) {
      pathAndSeedArr.push([filePaths[i], fileSeeds[i]]);
    }
  }
  return pathAndSeedArr;
}

/**
 * Returns `boolean` for if lesson seed contains `force` flag
 * @param {string} seed - The seed content
 * @returns {boolean} Whether the seed has the `force` flag
 */
export function isForceFlag(seed) {
  return seed.includes("#### --force--");
}

/**
 * Returns a string stripped from the input codeblock
 * @param {string} code - The codeblock to strip
 * @returns {string} The stripped codeblock
 */
export function extractStringFromCode(code) {
  return code.replace(/.*?```[a-z]+\n(.*?)\n```/s, "$1");
}
