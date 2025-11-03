export default {
  async fetch(request: Request) {
    const url = new URL(request.url);
    const name = url.searchParams.get('name') || 'World';
    console.log("hello test")
    return Response.json({ message: `Hello ${name}!` });
  },
};