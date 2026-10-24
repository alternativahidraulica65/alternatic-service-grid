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
- Fornecedores e terceiros usam um cadastro único (fornecedores.tipo_parceiro: material/servico/ambos); a tabela terceiros está obsoleta — evita cadastro duplicado entre oficina e financeiro.
- Fiscal identity (IE/IM, regime, structured address with IBGE code, NF-e/NFS-e series) lives as columns on empresas_emissoras and clientes, edited via src/lib/fiscal.ts + EnderecoFiscalCampos; the legacy text 'endereco' is derived from it — XML emission needs structured fields.
- Fiscal A1 certificates are AES-256-GCM encrypted server-side with FISCAL_CERT_MASTER_KEY and stored in certificados_fiscais_cofre (no anon/authenticated grants); only metadata is readable — the private key must never reach the browser or plain DB.
- Fiscal transmission goes through transmitirNota (server fn) to the VPS bridge (FISCAL_BRIDGE_URL/KEY); the certificate is decrypted only in the handler and the environment always comes from the reserved note — Workers cannot do mTLS.
