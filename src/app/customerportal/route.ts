import { Polar } from "@polar-sh/sdk";
import { NextResponse } from "next/server";

const polar = new Polar({
  accessToken: process.env["POLAR_ACCESS_TOKEN"] ?? "",
  server: "production"
});

export const GET = async () => {
  const result = await polar.customerSessions.create({
    customerId: "<value>",
  });

  return NextResponse.redirect(result.customerPortalUrl);
}
