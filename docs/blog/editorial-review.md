# Editorial reader and Android editor review — 16 November 2026

This work stays in the existing draft PR and protected Preview. It does not approve a Production release. No invitation, Auth setting, RLS policy, database row, storage bucket, domain or Production environment was changed for this editorial update.

## Implemented

- The shared article template uses locally hosted, licensed Manrope headings and Inter body type. It includes a reading width, real author/date/time metadata, a separate featured image, collapsible contents, semantic H2/H3, lists, quotes, scrollable tables, inline figures/captions, restrained labeled affiliate links, related published articles and existing guide/finder links. Main article text remains server rendered.
- Existing imported Markdown/HTML is parsed into the same allowlisted structured document used by the editor. Stored HTML is never injected. Script/iframe/form content, unsafe links and remote pasted tracking images are discarded. Input size, tree depth and supported elements are bounded. Existing article wording and retailer URLs are preserved; this is formatting repair, not factual verification of review claims.
- Opening an imported article prepares formatting locally without writing to the database. **Save draft** persists it through the existing revision-checked RPC. Autosave, Preview and Publish continue using the serialized revision queue; conflicting edits remain recoverable.
- A horizontally scrollable sticky toolbar provides Bold, H2/H3, images, links, lists, quotes, tables and explicitly labeled affiliate buttons. The `＋ Image` control follows the active paragraph. A mapped ProseMirror selection bookmark preserves insertion position through dialogs and asynchronous uploads.
- The image dialog accepts Android Photos/Files (JPEG/PNG/WebP), uses existing compression/validation and authenticated private Supabase upload, and supports the existing library, alt text and captions. Select an image, then **Edit image** to replace it/change its description, or **Remove image**. Removing an inline image does not delete the shared library file.
- Featured/card images remain a separate selection. Uploading an inline image adds it to the library; it does not silently replace the featured image.

## Greenhouse test-article hold

The owner designated article `bb983350-1c99-4b30-ad3a-5157313b020d` as not approved for public release. A narrowly scoped application hold in `src/config/blog-review.ts` excludes it from public listing/featured/related queries, public article and historical-slug routes, and sitemap queries. Publish/Schedule are disabled in the editor and rejected on the server for this ID. Save draft and private Preview remain available. Media referenced only by the held article requires administrator authorization; shared images still work for other published articles.

**The existing database snapshot/status is preserved.** This is a website release hold, not a database unpublish or new RLS policy. The original published snapshot still follows the existing Supabase publication RLS. If it must also be withdrawn from the anonymous database API, the owner should use **Unpublish** in the existing dashboard. Do not remove the application hold without the owner's release approval. The work does not connect or change Production.

## Android acceptance steps

1. Open the existing protected Preview and complete its normal Vercel access check. Do not use a protection bypass link.
2. Visit `/admin/blog`, sign in, then open the existing greenhouse article.
3. Select a few words with Android's text-selection handles and tap **Bold**. Put the cursor in a section heading and tap **H2**.
4. Select link text, tap **Link**, enter the retailer URL, and **Apply link**. For a clearly disclosed action, use **Affiliate button** and enter its URL and label.
5. Put the cursor where the image belongs, tap **Image** (or **＋ Image** after that paragraph), and choose Photos/Files. Select your real greenhouse photo or an existing uploaded image. Add **Image alt text** and an optional caption, then **Insert image**.
6. To make it the main article/card photo too, choose it separately in **Featured image**. Your existing uploaded photo is not automatically assigned.
7. Tap **Save draft**, wait for confirmation, leave and reopen. Confirm headings, emphasis, link, image and caption remain.
8. Tap **Preview**. Check the entire article and photograph. The greenhouse's Publish action remains disabled during this review.

Never share passwords or API keys in chat. No SMTP change or new invitation is required for the already activated administrator.

## Verification and limitations

The browser tests use the real editor and reader components, with an intercepted local API for controlled writes and a dimension adapter for private media. They test cursor-position insertion, asynchronous upload, invalid formats, caption editing/removal, links, affiliate disclosures, save/reopen, full-article rendering and overflow at 320/375/390/430/768/1280px. The complete owner article is an ignored local input, not a committed fixture. These checks do not claim a physical Android keyboard/photo-library test or a hosted authenticated Supabase write test.

Optional private full-article checks:

```sh
BLOG_REVIEW_ARTICLE_FILE=/absolute/path/to/private-record.json npm run test:blog
BLOG_REVIEW_ARTICLE_FILE=/absolute/path/to/private-record.json \
BLOG_REVIEW_PHOTO_FILE=/absolute/path/to/local-licensed-photo.jpg \
npm run test:e2e -- tests/blog-editorial.spec.ts --workers=2
```

The local screenshot photograph is an explicitly labeled **design-review substitute**, not an AMERLIFE product photo and not the owner's private upload: [Elizabeth Park greenhouse and herb garden](https://commons.wikimedia.org/wiki/File:Elizabeth_Park_greenhouse_and_herb_garden,_August_10,_2008.jpg), Ragesoss, [CC BY-SA 3.0](https://creativecommons.org/licenses/by-sa/3.0/). It is displayed at responsive sizes without content edits. It is not uploaded to Supabase, added to public site assets, or assigned to the real article. Private screenshots and the complete test article remain in ignored local artifacts. The real uploaded photo must be checked by the signed-in owner in protected Preview.

Self-hosted fonts include their OFL licenses under `public/fonts/`. New parsing dependencies are pinned; no new database, editor framework or storage provider was introduced.
