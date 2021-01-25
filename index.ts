import { Database, Statement } from "sqlite3";
import { Database as sqliteDatabase } from "sqlite";
import { open } from "sqlite";
import { IVerse, IVidTable } from "./verse";

const DatabaseRelativePath = `kjv.sqlite`;

export const KjvTableName = "kjv";

function OpenDatabase(): Promise<sqliteDatabase<Database, Statement>> {
  const path = require("path");
  const process = require("process");
  const dbPath = path.join(process.cwd(), DatabaseRelativePath);
  console.log(`biblemunger-kjv: looking for sqlite file at ${dbPath}`);
  const dbPromise = open({
    filename: path.resolve(dbPath),
    driver: Database,
  });
  return dbPromise;
}

/* Find all verses containing a string
 */
export async function concordance(textLike: string): Promise<IVerse[]> {
  const db = await OpenDatabase();
  const result = await db.all<IVerse[]>(
    `SELECT id, bookNum, chapterNum, verseNum, bookName, bookShortName, verseText FROM ${KjvTableName} WHERE verseText LIKE ?`,
    `%${textLike}%`
  );
  console.log(`concordance(${textLike}) returned ${result.length} results`);
  return result;
}

/* Find all verses between two verses containing a string
 */
export async function concordanceBetween(
  textLike: string,
  startVidTable: IVidTable,
  endVidTable: IVidTable
): Promise<IVerse[]> {
  const db = await OpenDatabase();
  const fromResult = await lookupVid(startVidTable);
  const toResult = await lookupVid(endVidTable);
  const result = await db.all<IVerse[]>(
    `SELECT id, bookNum, chapterNum, verseNum, bookName, bookShortName, verseText FROM ${KjvTableName} WHERE verseText LIKE $textLike AND id >= $fromId AND id <= $toId`,
    { $textLike: `%${textLike}%`, $fromId: fromResult.id, $toId: toResult.id }
  );
  console.log(
    `concordanceBetween(${textLike}) returned ${result.length} results`
  );
  return result;
}

/* Given a VidTable, return a single verse
 */
export async function lookupVid(vidTable: IVidTable): Promise<IVerse> {
  const db = await OpenDatabase();
  const result = await db.get<IVerse>(
    `SELECT id, bookNum, chapterNum, verseNum, bookName, bookShortName, verseText FROM ${KjvTableName} WHERE bookNum = $bookNum AND chapterNum = $chapterNum AND verseNum = $verseNum`,
    {
      $bookNum: vidTable.bookNum,
      $chapterNum: vidTable.chapterNum,
      $verseNum: vidTable.verseNum,
    }
  );
  return result;
}

/* Return the whole passage between two verses, given two VidTables
 */
export async function lookupPassage(
  startVidTable: IVidTable,
  endVidTable: IVidTable
): Promise<IVerse[]> {
  const db = await OpenDatabase();
  const fromResult = await lookupVid(startVidTable);
  const toResult = await lookupVid(endVidTable);
  const passageResult = await db.all<IVerse[]>(
    `SELECT id, bookNum, chapterNum, verseNum, bookName, bookShortName, verseText FROM ${KjvTableName} WHERE id >= $fromId AND id <= $toId`,
    {
      $fromId: fromResult.id,
      $toId: toResult.id,
    }
  );
  return passageResult;
}
