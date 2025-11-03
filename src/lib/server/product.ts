"use server" ;

import { Polar } from "@polar-sh/sdk";
import { redirect } from "next/navigation";

const polar = new Polar({
  accessToken: process.env.POLAR_ACCESS_TOKEN,
  server: "sandbox"
});

export const hobbyplanscription = async() => {
    const checkout = await polar.checkouts.create({
    products: [
        "e6da341e-78bb-4519-9e9b-978e95e21f51"
    ],
    successUrl: process.env.POLAR_SUCCESS_URL
    });

    redirect(checkout.url)
}
    