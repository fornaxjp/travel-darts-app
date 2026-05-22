import { NextResponse } from "next/server";

import { createTravelPlan } from "@/lib/travel-plan";

export async function POST(request: Request) {
  try {
    const body = (await request.json()) as {
      destinationPrefecture?: string;
      originPrefecture?: string | null;
      departureDate?: string | null;
      nights?: number | null;
      adults?: number | null;
    };

    if (!body.destinationPrefecture) {
      return NextResponse.json(
        { error: "destinationPrefecture is required" },
        { status: 400 },
      );
    }

    const plan = await createTravelPlan({
      destinationPrefecture: body.destinationPrefecture,
      originPrefecture: body.originPrefecture,
      departureDate: body.departureDate,
      nights: body.nights,
      adults: body.adults,
    });

    return NextResponse.json(plan);
  } catch (error) {
    const message = error instanceof Error ? error.message : "plan_generation_failed";
    return NextResponse.json({ error: message }, { status: 500 });
  }
}
