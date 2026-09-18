import type { WorkspaceRole } from "@prisma/client";

export type CardDetailMember = {
  id: string;
  name: string | null;
  email: string;
  image: string | null;
};

export type CardDetailLabel = {
  id: string;
  name: string;
  color: string;
};

/** Lightweight payload already on the board canvas — used to open the modal instantly. */
export type CardDetailSeed = {
  id: string;
  title: string;
  listId: string;
  listName: string;
  boardId: string;
  boardName: string;
  workspaceId: string;
  dueDate?: string | Date | null;
  isCompleted?: boolean;
  labels?: CardDetailLabel[];
  members?: CardDetailMember[];
};

export type BoardCardContext = {
  boardId: string;
  boardName: string;
  workspaceId: string;
  workspaceMembers: CardDetailMember[];
  boardLabels: CardDetailLabel[];
};

export type CardDetail = {
  id: string;
  title: string;
  description: unknown;
  dueDate: string | Date | null;
  isCompleted: boolean;
  list: {
    id: string;
    name: string;
    board: {
      id: string;
      name: string;
      workspaceId: string;
    };
  };
  members: { user: CardDetailMember }[];
  labels: { label: CardDetailLabel }[];
  checklists: {
    id: string;
    title: string;
    items: {
      id: string;
      title: string;
      isCompleted: boolean;
    }[];
  }[];
  comments: {
    id: string;
    body: string;
    createdAt: string | Date;
    userId: string;
    user: CardDetailMember;
  }[];
  attachments: {
    id: string;
    fileName: string;
    fileSize: number;
    mimeType: string;
    storageKey: string;
    storageProvider: string;
    createdAt: string | Date;
  }[];
  activities: {
    id: string;
    action: string;
    entityType: string;
    createdAt: string | Date;
    actor: { name: string | null; email: string };
  }[];
  currentRole: WorkspaceRole;
};

export function cardDetailQueryKey(cardId: string) {
  return ["card-detail", cardId] as const;
}

export function seedToCardDetail(
  seed: CardDetailSeed,
  role: WorkspaceRole = "GUEST",
): CardDetail {
  return {
    id: seed.id,
    title: seed.title,
    description: null,
    dueDate: seed.dueDate ?? null,
    isCompleted: !!seed.isCompleted,
    list: {
      id: seed.listId,
      name: seed.listName,
      board: {
        id: seed.boardId,
        name: seed.boardName,
        workspaceId: seed.workspaceId,
      },
    },
    members: (seed.members ?? []).map((user) => ({ user })),
    labels: (seed.labels ?? []).map((label) => ({ label })),
    checklists: [],
    comments: [],
    attachments: [],
    activities: [],
    currentRole: role,
  };
}
