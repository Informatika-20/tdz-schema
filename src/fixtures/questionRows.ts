// Stored `questions` rows, one per shape, shared by tdz and tabula20 so the
// two apps cannot drift apart. Import by path — not exported from the index.
//
// They mirror these tdz functions (change them and these rows together):
// - `row`: what `createQuestion` (src/app/admin/questions/actions.ts) and
//   `updateInputQuestion` / `updateMultipleChoiceQuestion` /
//   `updateStatementQuestion` / `uploadQuestionAudio`
//   (src/app/admin/editor/actions.ts) store.
// - `answer`: what the pupil client submits for that type — the choice key
//   (MultipleChoiceQuestion), the typed text as is (InputQuestion), or
//   key → true / false / null for „Neviem" (StatementQuestion).
// - `expectedScore`: what `calculateQuestionScore` (src/lib/scoring.ts)
//   returns for `answer`, on the 0–100 scale it uses, in an ordinary module.
//   The `sebavedomie` modules score multiple choice by letter instead
//   (a=100, b=66, c=33, d=0) and ignore `correctAnswer`.
//
// A statement keeps its answer key ONLY in `choices[key][1]`; `correctAnswer`
// stays null. An input's `correctAnswer` is always an array of strings.
export type QuestionRowFixture = {
  name: string;
  row: {
    questionType: string;
    question: string;
    choices: unknown;
    correctAnswer: unknown;
    scoringType: null;
    image: string | null;
    metadata: unknown;
  };
  answer: unknown;
  expectedScore: number;
};

export const QUESTION_ROW_FIXTURES: readonly QuestionRowFixture[] = [
  {
    name: "multiple_choice",
    row: {
      questionType: "multiple_choice",
      question: "Ktoré zariadenie je vstupné?",
      choices: {
        a: "Monitor",
        b: "Klávesnica",
        c: "Tlačiareň",
        d: "Reproduktor",
      },
      correctAnswer: ["b"],
      scoringType: null,
      image: null,
      metadata: null,
    },
    answer: "b",
    expectedScore: 100,
  },
  {
    // A choice whose value starts with "/" and ends in an image extension is
    // drawn as an image (legacy path under /TDZ_images).
    name: "multiple_choice_image_choices",
    row: {
      questionType: "multiple_choice",
      question: "Ktorý obrázok zobrazuje priečinok?",
      choices: {
        a: "/zs/3/8a.webp",
        b: "/zs/3/8b.webp",
        c: "/zs/3/8c.webp",
        d: "/zs/3/8d.webp",
      },
      correctAnswer: ["c"],
      scoringType: null,
      image: null,
      metadata: null,
    },
    answer: "a",
    expectedScore: 0,
  },
  {
    // An image uploaded through tabula20 is stored as its full URL.
    name: "multiple_choice_uploaded_image",
    row: {
      questionType: "multiple_choice",
      question: "Čo je na obrázku?",
      choices: { a: "Myš", b: "Klávesnica", c: "Monitor" },
      correctAnswer: ["a"],
      scoringType: null,
      image: "https://informatika20.sk/wp-content/uploads/2026/11/q.webp",
      metadata: null,
    },
    answer: "a",
    expectedScore: 100,
  },
  {
    // +1 per right statement, −1 per wrong one, 0 for „Neviem" (null), divided
    // by the number of statements answered: (1 + 1 + 0) / 3 → 67.
    name: "statement",
    row: {
      questionType: "statement",
      question: "Rozhodni, či sú tvrdenia o heslách pravdivé.",
      choices: {
        a: ["Silné heslo má aspoň 12 znakov.", true],
        b: ["Heslo je bezpečné poslať kamarátovi v správe.", false],
        c: ["Na každú stránku je lepšie mať iné heslo.", true],
      },
      correctAnswer: null,
      scoringType: null,
      image: null,
      metadata: null,
    },
    answer: { a: true, b: false, c: null },
    expectedScore: 67,
  },
  {
    name: "input",
    row: {
      questionType: "input",
      question: "Koľko bitov má jeden bajt?",
      choices: null,
      correctAnswer: ["8", "osem"],
      scoringType: null,
      image: null,
      metadata: null,
    },
    answer: "osem",
    expectedScore: 100,
  },
  {
    // `metadata.audio` is a path relative to the uploads base URL. Whitespace
    // in a typed answer is ignored when it is compared.
    name: "with_audio",
    row: {
      questionType: "input",
      question: "Vypočuj si nahrávku. Koľko metrov má jeden kilometer?",
      choices: null,
      correctAnswer: ["1000"],
      scoringType: null,
      image: null,
      metadata: { audio: "/2026/11/q.mp3" },
    },
    answer: "1 000",
    expectedScore: 100,
  },
];
