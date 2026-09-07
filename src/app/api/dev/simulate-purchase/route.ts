// Production artifacts never expose purchase-forging endpoints.
export function GET() { return new Response(null, { status: 404 }); }
export function POST() { return new Response(null, { status: 404 }); }
