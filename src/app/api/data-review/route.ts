import { NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";

export async function GET() {
  try {
    const [
      contactsMissingEmail,
      contactsMissingPhone,
      contactsMissingOrg,
      supporterClubsNoContact,
      supporterClubsNoEmail,
      eventsNoDate,
      eventsNoPriority,
      travelAgentsNoContact,
      oppsNoContact,
      contactsTotal,
      clubsTotal,
    ] = await Promise.all([
      prisma.contact.findMany({
        where: { email: null, status: "active" },
        take: 50,
        select: { id: true, fullName: true, role: true, organization: true, organizationType: true },
      }),
      prisma.contact.findMany({
        where: { phone: null, status: "active" },
        take: 50,
        select: { id: true, fullName: true, role: true, organization: true },
      }),
      prisma.contact.findMany({
        where: { organization: null, status: "active" },
        take: 50,
        select: { id: true, fullName: true, role: true, email: true },
      }),
      prisma.supporterClub.findMany({
        where: {
          status: "active",
          contacts: { none: {} },
        },
        take: 30,
        select: { id: true, clubName: true, teamSupported: true, country: true },
      }),
      prisma.supporterClub.findMany({
        where: { email: null, status: "active" },
        take: 30,
        select: { id: true, clubName: true, teamSupported: true, country: true },
      }),
      prisma.event.findMany({
        where: { eventDate: null, status: "active" },
        take: 30,
        select: { id: true, eventName: true, competition: true, country: true },
      }),
      prisma.event.findMany({
        where: { priorityRating: null, status: "active" },
        take: 30,
        select: { id: true, eventName: true, competition: true, eventDate: true },
      }),
      prisma.travelAgent.findMany({
        where: {
          status: "active",
          contacts: { none: {} },
        },
        take: 30,
        select: { id: true, companyName: true, country: true, specialization: true },
      }),
      prisma.opportunity.findMany({
        where: {
          AND: [
            { supporterCoordinatorFound: false },
            { clubContactAvailable: false },
          ],
        },
        take: 30,
        select: { id: true, title: true, travelingTeam: true, country: true, eventDate: true },
      }),
      prisma.contact.count({ where: { status: "active" } }),
      prisma.supporterClub.count({ where: { status: "active" } }),
    ]);

    return NextResponse.json({
      contactsMissingEmail: { items: contactsMissingEmail, count: contactsMissingEmail.length },
      contactsMissingPhone: { items: contactsMissingPhone, count: contactsMissingPhone.length },
      contactsMissingOrg:   { items: contactsMissingOrg,   count: contactsMissingOrg.length },
      supporterClubsNoContact: { items: supporterClubsNoContact, count: supporterClubsNoContact.length },
      supporterClubsNoEmail:   { items: supporterClubsNoEmail,   count: supporterClubsNoEmail.length },
      eventsNoDate:       { items: eventsNoDate,       count: eventsNoDate.length },
      eventsNoPriority:   { items: eventsNoPriority,   count: eventsNoPriority.length },
      travelAgentsNoContact: { items: travelAgentsNoContact, count: travelAgentsNoContact.length },
      oppsNoContact:      { items: oppsNoContact,      count: oppsNoContact.length },
      summary: {
        contactsTotal,
        clubsTotal,
        totalIssues:
          contactsMissingEmail.length +
          contactsMissingPhone.length +
          supporterClubsNoContact.length +
          eventsNoDate.length,
      },
    });
  } catch (error) {
    console.error("Data review error:", error);
    return NextResponse.json({ error: "Failed to load data review" }, { status: 500 });
  }
}
