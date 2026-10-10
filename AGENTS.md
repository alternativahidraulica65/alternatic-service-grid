<!-- LOVABLE:BEGIN -->
> [!IMPORTANT]
> This project is connected to [Lovable](https://lovable.dev). Avoid rewriting
> published git history — force pushing, or rebasing/amending/squashing commits
> that are already pushed — as it rewrites history on Lovable's side and the
> user will likely lose their project history.
>
> Commits you push to the connected branch sync back to Lovable and show up in
> the editor, so keep the branch in a working state.
<!-- LOVABLE:END -->

- Checklist document previews live in a dedicated component; completion signatures use persisted history events so refreshes retain the real evaluator.
- Checklist removal goes through an authenticated server function that validates protected user_roles before performing user-scoped deletion.
- Automatic piece costs use deterministic primary keys based on OS, piece and destination; creation occurs on destination actions, never page-load effects, preventing concurrent duplicates without overwriting amounts.
- Monetary editing uses a reusable PT-BR decimal input with validation and two-decimal formatting; payment controls remain separate from operational cost entry.
- AI cost-duplicate analysis runs in a server function that verifies the user's role before calling the AI Gateway; keeps the AI key server-side.
- Authenticated navigation is rendered once by the authenticated parent layout through AppNavigation so menu access and pin state survive navigation across all internal pages; dashboard routes render only their outlet.
