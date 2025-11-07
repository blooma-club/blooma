import { Polar } from "@polar-sh/sdk";
import { redirect } from "next/navigation";

const polar = new Polar({
  accessToken: process.env["POLAR_ACCESS_TOKEN"] ?? "",
  server: "production"
});

export const customerportal = async () => {
  const result = await polar.customerSessions.create({
    customerId: "<value>",
  });

  redirect(result.customerPortalUrl)
}