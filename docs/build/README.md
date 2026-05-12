# docs/build — generator for `TradePipeline-Documentation.docx`

This folder regenerates the full Word documentation at
`docs/TradePipeline-Documentation.docx`.

## Requirements

- Node.js 18+ (verified on 20.x).
- `npm` available on `PATH`.

## Regenerate the document

```bash
cd docs/build
npm install            # first time only — installs docx@9
node generate_docs.js  # writes ../TradePipeline-Documentation.docx
```

The script generates a US Letter document with:

- Cover page + auto Table of Contents
- 12 numbered sections covering introduction, architecture, configuration,
  every module, REST API, all 14 RV-XX rules, testing, CI/CD, Docker,
  security and operations
- Header on every page and `Page N of M` footer

If you modify the source code, rerun the script — the table contents
mirror what is in `src/` and `config/settings.yaml`.

## Notes

- `node_modules/` and `package-lock.json` are gitignored.
- `package.json` lists the single runtime dependency (`docx@9`).
