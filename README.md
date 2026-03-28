
## Demo

[![ShipBud demo video](https://img.youtube.com/vi/uRpG3PNFx1k/hqdefault.jpg)](https://youtu.be/uRpG3PNFx1k)

## Inspiration

As a solo student developer, I kept starting projects the wrong way — jumping straight into code without proper planning, then struggling to explain what I built in interviews. I also had a ton of project activity happening that never turned into anything shareable. Sure, I could ask ChatGPT for help, but it's a blank slate — it doesn't know my project, my stack, or where I'm at in development. I wanted a tool that felt like a knowledgeable buddy sitting beside me with full context: one that helps me think through my software properly *and* helps me document the journey as I go. ShipBud is the tool I wished I had from day one.
## What it does

1. Create a project
2. Chat with AI to help you define your Software Requirements, Design Doc, and Tests. 
3. Generate Milestones and Tasks that to gamify your development
4. Journal about the obstacles you ran into or the achievements you are proud of. 
5. When you are ready, generate content (Twitter post, or Blog post) from your journals.

## How we built it

We used Nextjs for the fullstack app paired with Vercel AI sdk & Gateway for the AI chat agents. then n8n and featherless ai for content generation.  We store everything in Prisma Postgres and hosted everything else in Vercel. 

We used AI for development and even tried using Devswarm, but due to limited space on my machne I ended up not using it.  

## Challenges we ran into
At first we also wanted to automate generation of journal by listening to github commits, but trying to get the access token via Auth0 token vault was not working. 

I tried using Devswarm on my machine, however I ran into the issue of every branch having to store its own node_modules which can get large.  If I had more space on my  machine it would have been worth it. 

## Accomplishments that we're proud of
I am proud of the AI chat agents that help you write Software Requirement, Design and Test documents. They are very helpful in developing full stack applications especially when using AI assistants like Github Copilot. Also because I built this so that I can use it to build more projects. The journals will help me in interviews or simply my Software Engineering career. 

## What we learned
I learned ways to create AI agents using different tools like Vercel AI, n8n, Featherless AI. I also learned about Devswarm which will be really good for developing multiple features/milestones in parallel. 

## What's next for shipbud
In the near future, I am thinking of polishing the UI and adding more automations to help me be more productive.

## Getting Started

First, run the development server:

```bash
npm run dev
```

Open [http://localhost:3000](http://localhost:3000) with your browser to see the result.

You can start editing the page by modifying `app/page.tsx`. The page auto-updates as you edit the file.

This project uses [`next/font`](https://nextjs.org/docs/app/building-your-application/optimizing/fonts) to automatically optimize and load [Geist](https://vercel.com/font), a new font family for Vercel.

## Learn More

To learn more about Next.js, take a look at the following resources:

- [Next.js Documentation](https://nextjs.org/docs) - learn about Next.js features and API.
- [Learn Next.js](https://nextjs.org/learn) - an interactive Next.js tutorial.

You can check out [the Next.js GitHub repository](https://github.com/vercel/next.js) - your feedback and contributions are welcome!

## Deploy on Vercel

The easiest way to deploy your Next.js app is to use the [Vercel Platform](https://vercel.com/new?utm_medium=default-template&filter=next.js&utm_source=create-next-app&utm_campaign=create-next-app-readme) from the creators of Next.js.

Check out our [Next.js deployment documentation](https://nextjs.org/docs/app/building-your-application/deploying) for more details.
