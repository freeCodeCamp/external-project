// These are used in the local scope of the `eval` in `runTests`
import fs from "fs";
import { assert } from "chai";
import __helpers from "./test-utils.js";

import { getLessonHintsAndTests, getLessonFromFile } from "./parser.js";

import { t, LOCALE } from "./t.js";
import { updateEnv, PATH } from "./env.js";
import runLesson from "./lesson.js";
import {
  toggleLoaderAnimation,
  updateTest,
  updateTests,
  updateConsole,
  updateHints,
} from "./client-socks.js";

export default async function runTests(ws, project, lessonNumber) {
  const locale = LOCALE === "undefined" ? "english" : LOCALE ?? "english";
  toggleLoaderAnimation(ws);
  try {
    const projectFile = `${PATH}/tooling/locales/${locale}/${project}.md`;
    const lesson = await getLessonFromFile(projectFile, lessonNumber);
    const hintsAndTestsArr = getLessonHintsAndTests(lesson);
    updateTests(
      ws,
      hintsAndTestsArr.reduce((acc, curr, i) => {
        return [
          ...acc,
          { passed: false, testText: curr[0], testId: i, isLoading: true },
        ];
      }, [])
    );
    const testPromises = hintsAndTestsArr.map(async ([hint, test], i) => {
      try {
        const _testOutput = await eval(`(async () => {${test}})();`);
        updateTest(ws, {
          passed: true,
          testText: hint,
          isLoading: false,
          testId: i,
        });
      } catch (e) {
        updateConsole(ws, JSON.stringify(e, null, 2));
        updateTest(ws, {
          passed: false,
          testText: hint,
          isLoading: false,
          testId: i,
        });
        return Promise.reject(`- ${hint}\n`);
      }
      return Promise.resolve();
    });

    try {
      const passed = await Promise.all(testPromises);
      if (passed) {
        console.log(await t("lesson-correct", { lessonNumber }));
        updateEnv({ CURRENT_LESSON: lessonNumber + 1 });
        runLesson(ws, project, lessonNumber + 1);
        updateHints(ws, "");
      }
    } catch (e) {
      console.log(e);
      updateHints(ws, e);
    }
  } catch (e) {
    console.log(await t("tests-error"));
    console.log(e);
  } finally {
    toggleLoaderAnimation(ws);
  }
}
