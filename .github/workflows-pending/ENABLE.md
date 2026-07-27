# ⚠️ CI-г идэвхжүүлэх

Энэ хавтас `.github/workflows/` байх ёстой боловч **түр зуур** нэр солигдсон.

## Яагаад?

Push хийх үед ашигласан GitHub токенд `workflow` scope байхгүй байсан тул
GitHub `.github/workflows/` доторх файлыг татгалзсан:

```
refusing to allow an OAuth App to create or update workflow
`.github/workflows/ci.yml` without `workflow` scope
```

Файлууд бүрэн бэлэн, зөвхөн идэвхжүүлэх л үлдсэн.

## Идэвхжүүлэх (2 алхам)

```bash
gh auth refresh -h github.com -s workflow
```

```bash
git mv .github/workflows-pending .github/workflows && \
git rm .github/workflows/ENABLE.md && \
git commit -m "ci: enable GitHub Actions workflow" && \
git push
```

Үүний дараа push бүрт `api` (tsc · eslint · jest) ба `web`
(tsc · eslint · next build) шалгалт зэрэг ажиллана.
