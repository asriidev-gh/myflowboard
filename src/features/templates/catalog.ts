export type BoardTemplateLabel = {
  name: string;
  color: string;
};

export type BoardTemplateCard = {
  title: string;
};

export type BoardTemplateList = {
  name: string;
  cards?: BoardTemplateCard[];
};

export type BoardTemplate = {
  id: string;
  name: string;
  description: string;
  category: string;
  accent: string;
  lists: BoardTemplateList[];
  labels: BoardTemplateLabel[];
};

/** Built-in board starters — no DB required. */
export const BOARD_TEMPLATES: BoardTemplate[] = [
  {
    id: "kanban",
    name: "Kanban",
    description: "Classic flow for continuous delivery teams.",
    category: "Engineering",
    accent: "#0f766e",
    lists: [
      {
        name: "Backlog",
        cards: [{ title: "Triage incoming requests" }],
      },
      {
        name: "To Do",
        cards: [{ title: "Pick the next shippable slice" }],
      },
      { name: "In Progress" },
      { name: "Review" },
      { name: "Done" },
    ],
    labels: [
      { name: "Feature", color: "#7c3aed" },
      { name: "Bug", color: "#dc2626" },
      { name: "Chore", color: "#475569" },
      { name: "Urgent", color: "#ea580c" },
    ],
  },
  {
    id: "sprint",
    name: "Sprint board",
    description: "Two-week sprint with review and QA gates.",
    category: "Engineering",
    accent: "#0369a1",
    lists: [
      { name: "Sprint backlog", cards: [{ title: "Confirm sprint goal" }] },
      { name: "In progress" },
      { name: "Code review" },
      { name: "QA" },
      { name: "Done" },
    ],
    labels: [
      { name: "Story", color: "#0f766e" },
      { name: "Bug", color: "#dc2626" },
      { name: "Spike", color: "#ca8a04" },
      { name: "Blocked", color: "#db2777" },
    ],
  },
  {
    id: "bug-tracker",
    name: "Bug tracker",
    description: "Triage and close defects without losing signal.",
    category: "Engineering",
    accent: "#dc2626",
    lists: [
      { name: "Reported", cards: [{ title: "Reproduce with steps" }] },
      { name: "Triaged" },
      { name: "In progress" },
      { name: "Fixed" },
      { name: "Verified" },
    ],
    labels: [
      { name: "P0", color: "#dc2626" },
      { name: "P1", color: "#ea580c" },
      { name: "P2", color: "#ca8a04" },
      { name: "Regression", color: "#7c3aed" },
    ],
  },
  {
    id: "content-calendar",
    name: "Content calendar",
    description: "Move ideas to published posts with clear stages.",
    category: "Marketing",
    accent: "#db2777",
    lists: [
      { name: "Ideas", cards: [{ title: "Brainstorm next theme" }] },
      { name: "Writing" },
      { name: "Editing" },
      { name: "Scheduled" },
      { name: "Published" },
    ],
    labels: [
      { name: "Blog", color: "#0369a1" },
      { name: "Social", color: "#db2777" },
      { name: "Newsletter", color: "#7c3aed" },
      { name: "Video", color: "#ea580c" },
    ],
  },
  {
    id: "product-launch",
    name: "Product launch",
    description: "Coordinate research through launch and follow-up.",
    category: "Product",
    accent: "#7c3aed",
    lists: [
      { name: "Research", cards: [{ title: "Validate problem statement" }] },
      { name: "Design" },
      { name: "Build" },
      { name: "Launch" },
      { name: "Follow-up" },
    ],
    labels: [
      { name: "Marketing", color: "#db2777" },
      { name: "Engineering", color: "#0f766e" },
      { name: "Design", color: "#7c3aed" },
      { name: "Ops", color: "#475569" },
    ],
  },
  {
    id: "personal",
    name: "Personal tasks",
    description: "Lightweight daily and weekly focus lists.",
    category: "Personal",
    accent: "#16a34a",
    lists: [
      { name: "Today", cards: [{ title: "Write down top 3 outcomes" }] },
      { name: "This week" },
      { name: "Later" },
      { name: "Done" },
    ],
    labels: [
      { name: "Work", color: "#0369a1" },
      { name: "Home", color: "#16a34a" },
      { name: "Health", color: "#0f766e" },
      { name: "Learning", color: "#7c3aed" },
    ],
  },
];

export function getBoardTemplate(id: string): BoardTemplate | undefined {
  return BOARD_TEMPLATES.find((template) => template.id === id);
}

export function listBoardTemplateCategories(): string[] {
  return [...new Set(BOARD_TEMPLATES.map((template) => template.category))];
}
