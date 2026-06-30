import "../src/config/loadEnv.js";
import { PrismaClient } from "@prisma/client";
import bcrypt from "bcryptjs";
import { computeAgaciro } from "@umuturanyi/shared";

const prisma = new PrismaClient();
const PASSWORD = "umuturanyi123";

async function recompute(userId: string) {
  const user = await prisma.user.findUnique({ where: { id: userId } });
  if (!user) return;
  const agg = await prisma.review.aggregate({ where: { subjectId: userId }, _avg: { rating: true }, _count: { rating: true } });
  const { score } = computeAgaciro({
    phoneVerified: user.phoneVerified,
    emailVerified: user.emailVerified,
    ratingAverage: agg._avg.rating ?? null,
    ratingCount: agg._count.rating,
    completedSales: user.completedSales,
    responseRate: 0.9,
    upheldReports: 0,
    accountAgeDays: (Date.now() - user.createdAt.getTime()) / 86_400_000,
  });
  await prisma.user.update({
    where: { id: userId },
    data: { agaciro: score, ratingAverage: agg._avg.rating ?? null, ratingCount: agg._count.rating },
  });
}

async function main() {
  console.log("🌱 Seeding Umuturanyi…");
  const hash = await bcrypt.hash(PASSWORD, 10);
  const daysAgo = (d: number) => new Date(Date.now() - d * 86_400_000);

  // ── Users ──────────────────────────────────────────────────────────────────
  const usersData = [
    { displayName: "Mukamana Aline", phone: "+250788100001", email: "aline@umuturanyi.rw", neighborhoodSlug: "kimironko", bio: "Ngurisha ibikoresho byo mu nzu bisukuye. Nkunda abakiriya.", phoneVerified: true, emailVerified: true, completedSales: 18, createdAt: daysAgo(420) },
    { displayName: "Jean Bosco", phone: "+250788100002", email: "bosco@umuturanyi.rw", neighborhoodSlug: "remera", bio: "Umuturanyi wizewe. Imodoka n'ibikoresho.", phoneVerified: true, emailVerified: true, completedSales: 24, createdAt: daysAgo(540) },
    { displayName: "Uwase Divine", phone: "+250788100003", email: "divine@umuturanyi.rw", neighborhoodSlug: "kacyiru", bio: "Imyenda n'imitako.", phoneVerified: true, completedSales: 9, createdAt: daysAgo(210) },
    { displayName: "Niyonzima Eric", phone: "+250788100004", neighborhoodSlug: "kicukiro", bio: "Elegitoroniki ku giciro cyiza.", phoneVerified: true, completedSales: 31, createdAt: daysAgo(300) },
    { displayName: "Keza Sandrine", phone: "+250788100005", email: "keza@umuturanyi.rw", neighborhoodSlug: "kimironko", bio: "Imboga n'imbuto bivuye mu murima.", phoneVerified: true, emailVerified: true, completedSales: 52, createdAt: daysAgo(610) },
    { displayName: "Habimana Patrick", phone: "+250788100006", neighborhoodSlug: "gisozi", bio: "Mushya hano. Ndatangira kugurisha.", completedSales: 1, createdAt: daysAgo(12) },
  ];

  const users = [] as { id: string; neighborhoodSlug: string }[];
  for (const u of usersData) {
    const created = await prisma.user.create({
      data: { ...u, passwordHash: hash, wallet: { create: { balance: 25_000 } } },
    });
    users.push({ id: created.id, neighborhoodSlug: created.neighborhoodSlug! });
  }
  const [aline, bosco, divine, eric, keza, patrick] = users;

  // Admin & moderator
  const admin = await prisma.user.create({
    data: {
      displayName: "Umuturanyi Admin",
      phone: "+250788000000",
      email: "admin@umuturanyi.rw",
      passwordHash: hash,
      role: "admin",
      neighborhoodSlug: "kacyiru",
      phoneVerified: true,
      emailVerified: true,
      createdAt: daysAgo(700),
      wallet: { create: {} },
    },
  });
  await prisma.user.create({
    data: {
      displayName: "Umuturanyi Moderator",
      phone: "+250788000001",
      email: "mod@umuturanyi.rw",
      passwordHash: hash,
      role: "moderator",
      neighborhoodSlug: "remera",
      phoneVerified: true,
      createdAt: daysAgo(365),
      wallet: { create: {} },
    },
  });

  // ── Listings ────────────────────────────────────────────────────────────────
  const point: Record<string, { lat: number; lng: number }> = {
    kimironko: { lat: -1.9446, lng: 30.1262 },
    remera: { lat: -1.9578, lng: 30.1127 },
    kacyiru: { lat: -1.9436, lng: 30.0925 },
    kicukiro: { lat: -1.9889, lng: 30.1031 },
    gisozi: { lat: -1.9192, lng: 30.0808 },
  };

  const listingData = [
    { sellerId: aline!.id, title: "Sofa nini y'abantu 3", description: "Sofa nziza y'abantu batatu, yakoreshejwe amezi 8 gusa. Iri mu mimerere myiza cyane, nta nenge ifite. Ushobora kuza kuyireba i Kimironko, kwishyura ukoresheje MoMo.", price: 120_000, categorySlug: "ibikoresho-byo-mu-nzu", neighborhoodSlug: "kimironko", condition: "like_new", viewCount: 64, favoriteCount: 24, createdAt: daysAgo(0.02) },
    { sellerId: keza!.id, title: "Imbuto z'inanasi nshya", description: "Inanasi nshya zivuye mu murima wa Nyagatare. Ku giciro cy'ubwinshi.", price: 1_500, categorySlug: "imboga", neighborhoodSlug: "kimironko", condition: "new", viewCount: 33, favoriteCount: 12, createdAt: daysAgo(0.1) },
    { sellerId: eric!.id, title: "iPhone 11 64GB", description: "Telefoni ikora neza, batiri nshya. Hamwe na charger.", price: 320_000, categorySlug: "ibikoresho-bya-elegitoroniki", neighborhoodSlug: "kicukiro", condition: "good", viewCount: 188, favoriteCount: 41, createdAt: daysAgo(1) },
    { sellerId: divine!.id, title: "Umwenda w'ubukwe", description: "Umwenda mwiza w'ubukwe, wambawe rimwe gusa.", price: 85_000, categorySlug: "imyenda", neighborhoodSlug: "kacyiru", condition: "like_new", viewCount: 76, favoriteCount: 28, createdAt: daysAgo(2) },
    { sellerId: bosco!.id, title: "Toyota RAV4 2012", description: "Imodoka ikora neza, yagiye gusa km 145,000. Papier zose ziri ku gihe.", price: 8_500_000, categorySlug: "imodoka", neighborhoodSlug: "remera", condition: "good", viewCount: 402, favoriteCount: 53, createdAt: daysAgo(3) },
    { sellerId: aline!.id, title: "Imeza yo mu gikoni", description: "Imeza y'ibiti bikomeye, ifite intebe 4.", price: 65_000, categorySlug: "ibikoresho-byo-mu-nzu", neighborhoodSlug: "kimironko", condition: "good", viewCount: 51, favoriteCount: 9, createdAt: daysAgo(4) },
    { sellerId: keza!.id, title: "Intebe z'abana ku buntu", description: "Intebe ebyiri z'abana, ndabitanga ku buntu ku muturanyi uzibikeneye.", price: 0, isFree: true, categorySlug: "ibikinisho", neighborhoodSlug: "kimironko", condition: "fair", viewCount: 120, favoriteCount: 34, createdAt: daysAgo(5) },
    { sellerId: patrick!.id, title: "Inzu y'ubukode - Gisozi", description: "Inzu ifite ibyumba 3, salle, n'ubwiherero. Ku kwezi.", price: 250_000, categorySlug: "amazu", neighborhoodSlug: "gisozi", condition: "good", viewCount: 215, favoriteCount: 47, createdAt: daysAgo(6) },
  ];

  const listings = [];
  for (const l of listingData) {
    const p = point[l.neighborhoodSlug]!;
    const created = await prisma.listing.create({
      data: { ...l, lat: p.lat, lng: p.lng, bumpedAt: l.createdAt },
    });
    listings.push(created);
  }

  // ── Favorites ────────────────────────────────────────────────────────────────
  await prisma.favorite.createMany({
    data: [
      { userId: bosco!.id, listingId: listings[0]!.id },
      { userId: divine!.id, listingId: listings[0]!.id },
      { userId: eric!.id, listingId: listings[4]!.id },
      { userId: aline!.id, listingId: listings[2]!.id },
    ],
  });

  // ── Reviews (feed Agaciro) ────────────────────────────────────────────────────
  await prisma.review.createMany({
    data: [
      { authorId: bosco!.id, subjectId: aline!.id, listingId: listings[0]!.id, rating: 5, comment: "Umuntu mwiza, igicuruzwa cyari nk'uko byavuzwe." },
      { authorId: divine!.id, subjectId: aline!.id, rating: 5, comment: "Yihuta kandi yizerwa." },
      { authorId: eric!.id, subjectId: aline!.id, rating: 4, comment: "Byiza cyane." },
      { authorId: aline!.id, subjectId: bosco!.id, rating: 5, comment: "Imodoka nziza, umuntu wizerwa." },
      { authorId: keza!.id, subjectId: bosco!.id, rating: 5, comment: "Murakoze!" },
      { authorId: keza!.id, subjectId: eric!.id, rating: 4, comment: "Telefoni ikora neza." },
    ],
  });

  // ── Community posts ───────────────────────────────────────────────────────────
  const postData = [
    { authorId: keza!.id, topicSlug: "umuganda", neighborhoodSlug: "kimironko", body: "Umuganda wo gusukura umudugudu uzaba ku wa gatandatu saa moya. Twese tuze tuzane amasuka!", likeCount: 0, commentCount: 0, viewCount: 48, createdAt: daysAgo(1) },
    { authorId: divine!.id, topicSlug: "umutekano", neighborhoodSlug: "kacyiru", body: "Mwirinde: hari abantu bibye telefoni mu modoka hafi ya stade. Mwitonde nimugoroba.", likeCount: 0, commentCount: 0, viewCount: 132, createdAt: daysAgo(2) },
    { authorId: aline!.id, topicSlug: "ibiribwa", neighborhoodSlug: "kimironko", body: "Hari uzi aho bagurisha amata mashya hafi ya Kimironko? Murakoze.", likeCount: 0, commentCount: 0, viewCount: 67, createdAt: daysAgo(3) },
    { authorId: patrick!.id, topicSlug: "ibyatakaye", neighborhoodSlug: "gisozi", body: "Nabonye imbwa nto y'umweru hafi ya Gisozi. Nyiri yo aramenyeshe.", likeCount: 0, commentCount: 0, viewCount: 89, createdAt: daysAgo(4) },
  ];
  const posts = [];
  for (const p of postData) posts.push(await prisma.post.create({ data: p }));

  // Likes & comments
  await prisma.postLike.createMany({
    data: [
      { postId: posts[0]!.id, userId: aline!.id },
      { postId: posts[0]!.id, userId: bosco!.id },
      { postId: posts[1]!.id, userId: keza!.id },
      { postId: posts[1]!.id, userId: eric!.id },
      { postId: posts[1]!.id, userId: aline!.id },
    ],
  });
  await prisma.post.update({ where: { id: posts[0]!.id }, data: { likeCount: 2 } });
  await prisma.post.update({ where: { id: posts[1]!.id }, data: { likeCount: 3 } });

  const c1 = await prisma.comment.create({ data: { postId: posts[2]!.id, authorId: keza!.id, body: "Yego! Mu isoko rya Kimironko hari uwagurisha amata mashya buri gitondo." } });
  await prisma.comment.create({ data: { postId: posts[2]!.id, authorId: aline!.id, parentId: c1.id, body: "Murakoze cyane!" } });
  await prisma.post.update({ where: { id: posts[2]!.id }, data: { commentCount: 2 } });

  // ── Conversations & messages ──────────────────────────────────────────────────
  const convo = await prisma.conversation.create({
    data: {
      listingId: listings[0]!.id,
      participants: { create: [{ userId: bosco!.id }, { userId: aline!.id }] },
      lastMessageAt: daysAgo(0.01),
    },
  });
  await prisma.message.create({ data: { conversationId: convo.id, senderId: bosco!.id, body: "Muraho, iyi sofa iracyahari?", createdAt: daysAgo(0.05), readAt: daysAgo(0.04) } });
  await prisma.message.create({ data: { conversationId: convo.id, senderId: aline!.id, body: "Yego iracyahari! Ushobora kuza kuyireba uyu munsi.", createdAt: daysAgo(0.04), readAt: daysAgo(0.03) } });
  await prisma.message.create({ data: { conversationId: convo.id, senderId: bosco!.id, body: "Byiza. Ese 110,000 byakunda?", createdAt: daysAgo(0.01) } });
  await prisma.conversationParticipant.updateMany({ where: { conversationId: convo.id, userId: aline!.id }, data: { unreadCount: 1 } });

  // ── Ibimina ──────────────────────────────────────────────────────────────────
  const ibimina = await prisma.ibimina.create({
    data: {
      name: "Ikimina cy'Abaturanyi",
      ownerId: aline!.id,
      contributionAmount: 10_000,
      cycleDays: 7,
      memberLimit: 8,
      status: "active",
      currentCycle: 2,
      neighborhoodSlug: "kimironko",
      members: {
        create: [
          { userId: aline!.id, joinPosition: 1, hasPaidCycle: true },
          { userId: keza!.id, joinPosition: 2, hasPaidCycle: true },
          { userId: divine!.id, joinPosition: 3, hasPaidCycle: false },
          { userId: bosco!.id, joinPosition: 4, hasPaidCycle: true },
        ],
      },
    },
  });
  void ibimina;

  // ── Akazi (local jobs & services) ─────────────────────────────────────────────
  const akaziData = [
    { posterId: keza!.id, kind: "job", title: "Dushaka umufasha wo mu bucuruzi", description: "Dushaka umukozi wo gufasha mu iduka ry'imbuto i Kimironko. Amasaha yo mu gitondo, iminsi 5 ku cyumweru. Ukunda abakiriya kandi ukora neza.", categorySlug: "ubucuruzi", employment: "part_time", payPeriod: "month", payMin: 80_000, payMax: 120_000, neighborhoodSlug: "kimironko", viewCount: 84, applicationCount: 0, createdAt: daysAgo(0.3) },
    { posterId: eric!.id, kind: "service", title: "Nkora isana rya telefoni na mudasobwa", description: "Mfite ubunararibonye bw'imyaka 6 mu gusana telefoni, mudasobwa, na tablet. Ndaza iwawe cyangwa unzanire. Igiciro gishingiye ku kibazo.", categorySlug: "gusana", employment: "flexible", payPeriod: "negotiable", neighborhoodSlug: "kicukiro", viewCount: 152, applicationCount: 0, createdAt: daysAgo(0.6) },
    { posterId: divine!.id, kind: "service", title: "Isuku y'inzu n'ububiko", description: "Ntanga serivisi z'isuku y'amazu n'ibiro buri munsi cyangwa buri cyumweru. Nkora neza kandi nizerwa.", categorySlug: "isuku", employment: "flexible", payPeriod: "day", payMin: 8_000, payMax: 12_000, neighborhoodSlug: "kacyiru", viewCount: 71, applicationCount: 0, createdAt: daysAgo(1.5) },
    { posterId: bosco!.id, kind: "service", title: "Gutwara imizigo na moto", description: "Ndatwara imizigo mito na moto mu Kigali hose. Vuba kandi ku giciro gito.", categorySlug: "gutwara", employment: "gig", payPeriod: "fixed", payMin: 2_000, payMax: 5_000, neighborhoodSlug: "remera", isRemote: false, viewCount: 38, applicationCount: 0, createdAt: daysAgo(2) },
    { posterId: aline!.id, kind: "job", title: "Dushaka umwarimu wigisha abana imibare", description: "Dukeneye umwarimu wigisha abana b'amashuri abanza imibare n'icyongereza, kabiri ku cyumweru nyuma y'amasomo. Ahantu: Kimironko.", categorySlug: "kwigisha", employment: "contract", payPeriod: "hour", payMin: 3_000, payMax: 5_000, neighborhoodSlug: "kimironko", viewCount: 64, applicationCount: 0, createdAt: daysAgo(3) },
    { posterId: patrick!.id, kind: "service", title: "Ubwubatsi n'isana ry'amazu", description: "Mfite itsinda ry'abubatsi. Dukora kubaka, gusana, no gusiga irangi. Tubasanga mu Gisozi n'ahandi.", categorySlug: "ubwubatsi", employment: "contract", payPeriod: "negotiable", neighborhoodSlug: "gisozi", viewCount: 96, applicationCount: 0, createdAt: daysAgo(4) },
  ];
  const akaziPosts = [];
  for (const a of akaziData) {
    const p = point[a.neighborhoodSlug]!;
    akaziPosts.push(await prisma.akaziListing.create({ data: { ...a, lat: p.lat, lng: p.lng, bumpedAt: a.createdAt } }));
  }

  // A couple of saved posts + one application (so the board feels alive).
  await prisma.akaziBookmark.createMany({
    data: [
      { userId: aline!.id, akaziId: akaziPosts[1]!.id },
      { userId: bosco!.id, akaziId: akaziPosts[4]!.id },
    ],
  });
  await prisma.akaziListing.update({ where: { id: akaziPosts[1]!.id }, data: { bookmarkCount: 1 } });
  await prisma.akaziListing.update({ where: { id: akaziPosts[4]!.id }, data: { bookmarkCount: 1 } });

  await prisma.akaziApplication.create({
    data: { akaziId: akaziPosts[0]!.id, applicantId: patrick!.id, message: "Muraho, nifuza akazi. Mfite ubunararibonye mu bucuruzi imyaka 2.", status: "submitted" },
  });
  await prisma.akaziListing.update({ where: { id: akaziPosts[0]!.id }, data: { applicationCount: 1 } });

  // ── Notifications ─────────────────────────────────────────────────────────────
  await prisma.notification.createMany({
    data: [
      { userId: aline!.id, type: "listing_favorited", title: "Jean Bosco yakunze igicuruzwa cyawe", body: "Sofa nini y'abantu 3", link: `/isoko/${listings[0]!.id}`, actorId: bosco!.id, createdAt: daysAgo(0.2) },
      { userId: aline!.id, type: "message", title: "Ubutumwa bushya bwa Jean Bosco", link: `/ubutumwa/${convo.id}`, actorId: bosco!.id, createdAt: daysAgo(0.01) },
    ],
  });

  for (const u of [aline!, bosco!, divine!, eric!, keza!, patrick!]) await recompute(u.id);
  await recompute(admin.id);

  const counts = {
    users: await prisma.user.count(),
    listings: await prisma.listing.count(),
    posts: await prisma.post.count(),
    akazi: await prisma.akaziListing.count(),
    ibimina: await prisma.ibimina.count(),
  };
  console.log("✅ Seed complete:", counts);
  console.log(`   Login with any phone above and password "${PASSWORD}" (e.g. +250788100001).`);
  console.log(`   Admin: +250788000000 / ${PASSWORD}`);
}

main()
  .catch((err) => {
    console.error("❌ Seed failed:", err);
    process.exit(1);
  })
  .finally(() => prisma.$disconnect());
