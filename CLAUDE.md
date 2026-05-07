<!-- SPECKIT START -->
For additional context about technologies to be used, project structure,
shell commands, and other important information, read the current plan
<!-- SPECKIT END -->

A website for an advertising agency.

Figma links
- https://www.figma.com/design/Tn13DucUjPCe8PCA7ZIdK3/Site-TG--Copy-?node-id=75-1710&m=dev

**Figma usage:** The Figma file is messy and should NOT be used as a whole. Approach it block by block — reference only the specific section/component needed at that moment. Do not attempt to implement the full design in one pass.

**IMPORTANT:** Never assume or reuse a Figma block URL. Always ask the user for the specific Figma block link before starting work on any UI section.

We need to define the tech stack, project structure, and the development workflow.

It should be able to run on docker. We'll be delivering the website to the client via .zip or git.

## Claude Memory

Claude's persistent memory for this project is stored at:
`./memory/MEMORY.md`

Consult it at the start of each session for stack decisions, architectural choices, and project context.

**Memory update rule:** After every major change (new file created, stack decision made, architecture updated, significant feature added or removed), update `./memory/MEMORY.md` to reflect the current state. Keep it concise and accurate — it is the team's shared source of truth.

Additional memory files:
- `./memory/client-handoff.md` — issues and setup steps to communicate to the client before delivery (e.g. Gmail App Password setup for the contact form)