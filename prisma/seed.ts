/**
 * Demo seed — john (owner) + jane (member) on a sample workspace/board.
 * Run: npm run db:seed
 */
import { PrismaClient } from "@prisma/client";
import { hash } from "bcryptjs";

const prisma = new PrismaClient();

async function main() {
  const passwordHash = await hash("password123", 12);

  const john = await prisma.user.upsert({
    where: { email: "john@acme.dev" },
    update: {},
    create: {
      name: "John Developer",
      email: "john@acme.dev",
      passwordHash,
      timezone: "Asia/Singapore",
      bio: "Building products with FlowBoard.",
      notificationPrefs: { create: {} },
    },
  });

  const jane = await prisma.user.upsert({
    where: { email: "jane@acme.dev" },
    update: {},
    create: {
      name: "Jane Designer",
      email: "jane@acme.dev",
      passwordHash,
      timezone: "Asia/Singapore",
      bio: "Designing flows on FlowBoard.",
      notificationPrefs: { create: {} },
    },
  });

  const workspace = await prisma.workspace.upsert({
    where: { slug: "acme" },
    update: {},
    create: {
      name: "Acme",
      slug: "acme",
      description: "Demo workspace for FlowBoard.",
      createdById: john.id,
      members: {
        create: [
          { userId: john.id, role: "OWNER" },
          { userId: jane.id, role: "MEMBER" },
        ],
      },
    },
  });

  // Ensure both members exist if workspace already existed without Jane.
  await prisma.workspaceMember.upsert({
    where: {
      workspaceId_userId: { workspaceId: workspace.id, userId: john.id },
    },
    update: {},
    create: { workspaceId: workspace.id, userId: john.id, role: "OWNER" },
  });
  await prisma.workspaceMember.upsert({
    where: {
      workspaceId_userId: { workspaceId: workspace.id, userId: jane.id },
    },
    update: {},
    create: { workspaceId: workspace.id, userId: jane.id, role: "MEMBER" },
  });

  let board = await prisma.board.findFirst({
    where: { workspaceId: workspace.id, name: "Product Launch" },
  });

  if (!board) {
    board = await prisma.board.create({
      data: {
        name: "Product Launch",
        description: "Demo board with lists and cards.",
        workspaceId: workspace.id,
        createdById: john.id,
        lists: {
          create: [
            {
              name: "To Do",
              position: "1000",
              cards: {
                create: [
                  {
                    title: "Draft launch checklist",
                    position: "1000",
                    createdById: john.id,
                  },
                  {
                    title: "Assign owners for each workstream",
                    position: "2000",
                    createdById: john.id,
                  },
                ],
              },
            },
            {
              name: "Doing",
              position: "2000",
              cards: {
                create: [
                  {
                    title: "Polish board card UI",
                    position: "1000",
                    createdById: jane.id,
                  },
                ],
              },
            },
            {
              name: "Done",
              position: "3000",
              cards: {
                create: [
                  {
                    title: "Seed demo data",
                    position: "1000",
                    createdById: john.id,
                    isCompleted: true,
                  },
                ],
              },
            },
          ],
        },
        labels: {
          create: [
            { name: "Design", color: "#7c3aed" },
            { name: "Engineering", color: "#0f766e" },
            { name: "Urgent", color: "#db2777" },
          ],
        },
      },
    });
  }

  console.log(`Seeded users:`);
  console.log(`  john@acme.dev / password123 (owner)`);
  console.log(`  jane@acme.dev / password123 (member)`);
  console.log(`Workspace: ${workspace.name} (${workspace.slug})`);
  console.log(`Board: ${board.name} → /boards/${board.id}`);
}

main()
  .catch((error) => {
    console.error(error);
    process.exit(1);
  })
  .finally(async () => {
    await prisma.$disconnect();
  });
