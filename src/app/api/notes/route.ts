import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";

export async function POST(req: NextRequest) {
  try {
    const data = await req.json();
    const { content, noteType, eventId, opportunityId, supporterClubId, contactId, travelAgentId, clubDepartmentId } = data;

    if (!content?.trim()) {
      return NextResponse.json({ error: "Content is required" }, { status: 400 });
    }

    const note = await prisma.outreachNote.create({
      data: {
        content: content.trim(),
        noteType: noteType ?? "general",
        eventId:          eventId          || null,
        opportunityId:    opportunityId    || null,
        supporterClubId:  supporterClubId  || null,
        contactId:        contactId        || null,
        travelAgentId:    travelAgentId    || null,
        clubDepartmentId: clubDepartmentId || null,
      },
    });

    return NextResponse.json(note, { status: 201 });
  } catch (error) {
    console.error("Notes POST error:", error);
    return NextResponse.json({ error: "Failed to create note" }, { status: 500 });
  }
}
