import { v4 as uuidv4 } from "uuid";
import type { User, Task, Submission, TaskType, SubmissionStatus, SubmissionData } from "./types";

// ── Helpers ─────────────────────────────────────────────────────────────────

const STORAGE_KEYS = {
  users: "task-hub:users",
  tasks: "task-hub:tasks",
  submissions: "task-hub:submissions",
  seedVersion: "task-hub:seed-version",
} as const;

// Bump this when the seed schema changes to force a re-seed.
const SEED_VERSION = 2;

function randomDate(daysAgo: number, daysAgoEnd: number = 0): string {
  const now = Date.now();
  const msPerDay = 86_400_000;
  const start = now - daysAgo * msPerDay;
  const end = now - daysAgoEnd * msPerDay;
  const ts = start + Math.random() * (end - start);
  return new Date(ts).toISOString();
}

function pick<T>(arr: readonly T[]): T {
  return arr[Math.floor(Math.random() * arr.length)];
}

// ── Campaign IDs ────────────────────────────────────────────────────────────

const campaignIds: readonly string[] = [
  uuidv4(), // Spring Product Launch
  uuidv4(), // Customer Re-engagement
  uuidv4(), // Brand Awareness Q1
  uuidv4(), // Influencer Outreach
  uuidv4(), // Holiday Promo Follow-up
  uuidv4(), // Newsletter Growth
];

// ── Users ───────────────────────────────────────────────────────────────────

const adminId = uuidv4();

const userIds: readonly string[] = [
  uuidv4(),
  uuidv4(),
  uuidv4(),
  uuidv4(),
  uuidv4(),
];

export const seedUsers: User[] = [
  {
    id: adminId,
    name: "Olivia Martinez",
    email: "olivia.martinez@taskhub.io",
    role: "admin",
    avatar_url: "https://api.dicebear.com/9.x/avataaars/svg?seed=olivia",
  },
  {
    id: userIds[0],
    name: "James Chen",
    email: "james.chen@example.com",
    role: "user",
    avatar_url: "https://api.dicebear.com/9.x/avataaars/svg?seed=james",
  },
  {
    id: userIds[1],
    name: "Priya Sharma",
    email: "priya.sharma@example.com",
    role: "user",
    avatar_url: "https://api.dicebear.com/9.x/avataaars/svg?seed=priya",
  },
  {
    id: userIds[2],
    name: "Marcus Johnson",
    email: "marcus.johnson@example.com",
    role: "user",
    avatar_url: "https://api.dicebear.com/9.x/avataaars/svg?seed=marcus",
  },
  {
    id: userIds[3],
    name: "Sofia Rossi",
    email: "sofia.rossi@example.com",
    role: "user",
    avatar_url: "https://api.dicebear.com/9.x/avataaars/svg?seed=sofia",
  },
  {
    id: userIds[4],
    name: "Daniel Okafor",
    email: "daniel.okafor@example.com",
    role: "user",
    avatar_url: "https://api.dicebear.com/9.x/avataaars/svg?seed=daniel",
  },
];

// ── Tasks ───────────────────────────────────────────────────────────────────

interface TaskSeed {
  task_type: TaskType;
  title: string;
  description: string;
  details: string;
  amount: number;
  reward: number;
  allow_multiple_submissions: boolean;
  campaign_index: number;
  softDeleted?: boolean;
}

const taskSeeds: readonly TaskSeed[] = [
  // ── social_media_posting (9) ──────────────────────────────────────────────
  {
    task_type: "social_media_posting",
    title: "Post Spring Collection Highlight on Instagram",
    description: "Share a carousel post featuring 3 items from our Spring 2026 collection.",
    details: "Use hashtags #SpringStyle2026 #FreshLooks. Tag @ourstore. Include a short personal review in the caption (50+ words). Post must stay live for at least 48 hours.",
    amount: 20, reward: 8, allow_multiple_submissions: true, campaign_index: 0,
  },
  {
    task_type: "social_media_posting",
    title: "Tweet About Our Free Shipping Deal",
    description: "Create an original tweet promoting our weekend free-shipping offer.",
    details: "Mention the code FREESHIP26. Include a link to https://ourstore.example.com/deals. Keep it under 280 characters.",
    amount: 30, reward: 4, allow_multiple_submissions: true, campaign_index: 0,
  },
  {
    task_type: "social_media_posting",
    title: "Share Product Unboxing on TikTok",
    description: "Film a short unboxing video of our new headphones and post it to TikTok.",
    details: "Video should be 30-60 seconds. Use the trending sound #UnboxWithMe. Tag @ourbrand.",
    amount: 10, reward: 15, allow_multiple_submissions: false, campaign_index: 3,
  },
  {
    task_type: "social_media_posting",
    title: "LinkedIn Article: Remote Work Tips",
    description: "Publish a short LinkedIn post about remote work productivity featuring our app.",
    details: "Minimum 100 words. Mention how our tool improves daily workflow. Professional tone required.",
    amount: 15, reward: 12, allow_multiple_submissions: false, campaign_index: 2,
  },
  {
    task_type: "social_media_posting",
    title: "Facebook Story: Fitness Challenge Week 3",
    description: "Post a Facebook Story showing your Week 3 progress with our fitness tracker.",
    details: "Include a screenshot of your dashboard. Use the sticker pack we provided. Mention @FitTrackOfficial.",
    amount: 25, reward: 5, allow_multiple_submissions: true, campaign_index: 2,
  },
  {
    task_type: "social_media_posting",
    title: "Reddit Post in r/deals",
    description: "Create a Reddit post highlighting our seasonal clearance sale.",
    details: "Post in r/deals or r/frugal. Follow subreddit rules. Include pricing details and direct link.",
    amount: 10, reward: 6, allow_multiple_submissions: false, campaign_index: 4,
  },
  {
    task_type: "social_media_posting",
    title: "Pinterest Pin: DIY Home Decor",
    description: "Create a Pinterest pin linking to our DIY home decor blog post.",
    details: "Use a vertical image (2:3 ratio). Write a keyword-rich description.",
    amount: 20, reward: 3, allow_multiple_submissions: true, campaign_index: 0,
  },
  {
    task_type: "social_media_posting",
    title: "YouTube Community Post: Product Poll",
    description: "Post a community poll on YouTube asking followers which product colorway they prefer.",
    details: "Include all 4 colorway options. Add a thumbnail image.",
    amount: 5, reward: 10, allow_multiple_submissions: false, campaign_index: 3, softDeleted: true,
  },
  {
    task_type: "social_media_posting",
    title: "Threads Post: Quick Review",
    description: "Write a short Threads post reviewing our new portable charger.",
    details: "Keep it authentic and under 500 characters. Include one photo. Use #TechReview.",
    amount: 35, reward: 4, allow_multiple_submissions: true, campaign_index: 2,
  },
  // ── email_sending (8) ─────────────────────────────────────────────────────
  {
    task_type: "email_sending",
    title: "Send Re-engagement Email to Lapsed Subscribers",
    description: "Send a personalized re-engagement email to a list of 50 inactive subscribers.",
    details: "Use the provided Mailchimp template. Personalize the greeting with the subscriber's first name.",
    amount: 50, reward: 20, allow_multiple_submissions: false, campaign_index: 1,
  },
  {
    task_type: "email_sending",
    title: "Welcome Sequence Email #1",
    description: "Draft and send the first email in our welcome sequence to new sign-ups.",
    details: "Warm, friendly tone. Include a CTA to complete their profile. Attach the brand style guide PDF.",
    amount: 30, reward: 10, allow_multiple_submissions: false, campaign_index: 1,
  },
  {
    task_type: "email_sending",
    title: "Product Launch Announcement Email",
    description: "Send a launch announcement email for our new smartwatch to the VIP list.",
    details: "Highlight the 3 key features. Include early-bird pricing ($199 vs $249). Add an 'Order Now' button.",
    amount: 20, reward: 12, allow_multiple_submissions: false, campaign_index: 0,
  },
  {
    task_type: "email_sending",
    title: "Survey Follow-up Thank You Email",
    description: "Send a thank-you email to customers who completed our satisfaction survey.",
    details: "Include a 15% discount code THANKS15 as a thank-you. Keep it brief — under 150 words.",
    amount: 40, reward: 8, allow_multiple_submissions: true, campaign_index: 1,
  },
  {
    task_type: "email_sending",
    title: "Weekly Newsletter: March Edition",
    description: "Compile and send the weekly newsletter with curated content.",
    details: "Include: 2 blog highlights, 1 upcoming event, 1 featured product. Use the newsletter template.",
    amount: 5, reward: 25, allow_multiple_submissions: false, campaign_index: 5,
  },
  {
    task_type: "email_sending",
    title: "Abandoned Cart Reminder Email",
    description: "Send cart abandonment emails to users who left items in their cart over 24h ago.",
    details: "Include the specific product(s) they left behind. Offer free shipping if they complete checkout within 48 hours.",
    amount: 35, reward: 7, allow_multiple_submissions: false, campaign_index: 4,
  },
  {
    task_type: "email_sending",
    title: "Partner Outreach Email",
    description: "Send outreach emails to 15 potential brand partners for our influencer program.",
    details: "Personalize each email with the partner's recent content. Mention mutual benefits. Include our media kit.",
    amount: 15, reward: 18, allow_multiple_submissions: false, campaign_index: 3,
  },
  {
    task_type: "email_sending",
    title: "Event Invitation: Virtual Workshop",
    description: "Send invitations for our upcoming virtual design workshop.",
    details: "Include date (March 28, 2026, 2 PM EST), Zoom link, agenda overview, and RSVP button.",
    amount: 25, reward: 6, allow_multiple_submissions: true, campaign_index: 5, softDeleted: true,
  },
  // ── social_media_liking (8) ───────────────────────────────────────────────
  {
    task_type: "social_media_liking",
    title: "Like Our Latest Instagram Reel",
    description: "Like the Instagram Reel posted on our official account today.",
    details: "Navigate to @ourbrand on Instagram. Find the latest Reel. Like it. Screenshot the liked state.",
    amount: 50, reward: 2, allow_multiple_submissions: false, campaign_index: 2,
  },
  {
    task_type: "social_media_liking",
    title: "Like 5 Product Review Tweets",
    description: "Find and like 5 tweets from real users reviewing our products.",
    details: "Search for tweets mentioning @ourbrand or #OurBrandReview. Like 5 distinct tweets from different users.",
    amount: 20, reward: 5, allow_multiple_submissions: true, campaign_index: 2,
  },
  {
    task_type: "social_media_liking",
    title: "Engage with Facebook Launch Post",
    description: "Like and react to our product launch post on Facebook.",
    details: "Go to our Facebook page. Find the pinned launch post. Use the 'Love' reaction. Screenshot it.",
    amount: 40, reward: 2, allow_multiple_submissions: false, campaign_index: 0,
  },
  {
    task_type: "social_media_liking",
    title: "Like YouTube Video: Product Tutorial",
    description: "Like our latest product tutorial video on YouTube.",
    details: "Video title: 'Getting Started with SmartTrack Pro'. Click thumbs-up. Screenshot the liked state.",
    amount: 30, reward: 3, allow_multiple_submissions: false, campaign_index: 3,
  },
  {
    task_type: "social_media_liking",
    title: "Like LinkedIn Company Page Updates",
    description: "Like the 3 most recent posts on our LinkedIn company page.",
    details: "Visit our LinkedIn company page. Like the 3 newest posts. Screenshot each showing the like.",
    amount: 15, reward: 4, allow_multiple_submissions: false, campaign_index: 2,
  },
  {
    task_type: "social_media_liking",
    title: "Like Reddit Comments in Our AMA",
    description: "Upvote the top 10 comments in our Reddit AMA thread.",
    details: "Navigate to the AMA thread. Upvote the top 10 parent comments. Screenshot the thread.",
    amount: 10, reward: 3, allow_multiple_submissions: false, campaign_index: 4,
  },
  {
    task_type: "social_media_liking",
    title: "Like Pinterest Pins from Our Board",
    description: "Like 8 pins from our 'Spring Inspiration' Pinterest board.",
    details: "Like any 8 pins from the board. Take one screenshot showing your liked pins collection.",
    amount: 25, reward: 3, allow_multiple_submissions: true, campaign_index: 0,
  },
  {
    task_type: "social_media_liking",
    title: "Like TikTok Videos from Brand Ambassadors",
    description: "Like the latest video from each of our 5 brand ambassadors on TikTok.",
    details: "Like their most recent video. Screenshot each liked video.",
    amount: 15, reward: 4, allow_multiple_submissions: false, campaign_index: 3,
  },
];

export const seedTasks: Task[] = taskSeeds.map((seed) => {
  const createdAt = randomDate(30, 5);
  const updatedAtDate = new Date(
    new Date(createdAt).getTime() + Math.random() * 3 * 86_400_000
  );
  const deletedAt = seed.softDeleted
    ? new Date(updatedAtDate.getTime() + Math.random() * 2 * 86_400_000).toISOString()
    : null;

  return {
    id: uuidv4(),
    task_type: seed.task_type,
    title: seed.title,
    description: seed.description,
    details: seed.details,
    amount: seed.amount,
    reward: seed.reward,
    allow_multiple_submissions: seed.allow_multiple_submissions,
    campaign_id: campaignIds[seed.campaign_index],
    created_at: createdAt,
    updated_at: updatedAtDate.toISOString(),
    deleted_at: deletedAt,
  };
});

// ── Submissions ─────────────────────────────────────────────────────────────

const SCREENSHOT_BASE = "https://storage.example.com/evidence";

function buildSubmissionData(taskType: TaskType, taskTitle: string): SubmissionData {
  const screenshotUrl = `${SCREENSHOT_BASE}/${uuidv4()}.png`;

  switch (taskType) {
    case "social_media_posting":
      return {
        task_type: "social_media_posting",
        post_url: `https://social.example.com/posts/${uuidv4().slice(0, 8)}`,
        evidence_screenshot_url: screenshotUrl,
      };
    case "email_sending":
      return {
        task_type: "email_sending",
        email_content: `Hi there, just wanted to follow up on ${taskTitle.toLowerCase()}. Looking forward to hearing from you!`,
        evidence_screenshot_url: screenshotUrl,
      };
    case "social_media_liking":
      return {
        task_type: "social_media_liking",
        post_url: `https://social.example.com/posts/${uuidv4().slice(0, 8)}`,
        evidence_screenshot_url: screenshotUrl,
      };
  }
}

function buildSubmissions(): Submission[] {
  const submissions: Submission[] = [];
  const emptyTaskIndices = new Set([5, 14]);
  const statuses: readonly SubmissionStatus[] = ["pending", "approved", "rejected"];

  const eligibleIndices = seedTasks
    .map((_, i) => i)
    .filter((i) => !emptyTaskIndices.has(i));

  const baseCounts = eligibleIndices.map(() => 2);
  let remaining = 60 - baseCounts.reduce((a, b) => a + b, 0);
  let idx = 0;
  while (remaining > 0) {
    baseCounts[idx % baseCounts.length] += 1;
    remaining -= 1;
    idx += 1;
  }

  eligibleIndices.forEach((taskIdx, i) => {
    const task = seedTasks[taskIdx];
    const count = baseCounts[i];

    for (let j = 0; j < count; j++) {
      const pickedUserId = pick(userIds);
      const status: SubmissionStatus = pick(statuses);
      const submittedAt = randomDate(25, 2);
      const reviewedAt =
        status === "pending"
          ? null
          : new Date(
              new Date(submittedAt).getTime() + Math.random() * 3 * 86_400_000
            ).toISOString();

      submissions.push({
        id: uuidv4(),
        task_id: task.id,
        user_id: pickedUserId,
        status,
        data: buildSubmissionData(task.task_type, task.title),
        submitted_at: submittedAt,
        reviewed_at: reviewedAt,
      });
    }
  });

  return submissions;
}

export const seedSubmissions: Submission[] = buildSubmissions();

// ── seedDatabase ────────────────────────────────────────────────────────────

export function seedDatabase(): void {
  if (typeof window === "undefined") return;

  const storedVersion = localStorage.getItem(STORAGE_KEYS.seedVersion);
  const isStale = storedVersion !== String(SEED_VERSION);

  if (isStale) {
    // Clear old data so we can re-seed with the current schema.
    localStorage.removeItem(STORAGE_KEYS.users);
    localStorage.removeItem(STORAGE_KEYS.tasks);
    localStorage.removeItem(STORAGE_KEYS.submissions);
    localStorage.removeItem("task-hub:current-user");
    localStorage.setItem(STORAGE_KEYS.seedVersion, String(SEED_VERSION));
  }

  if (!localStorage.getItem(STORAGE_KEYS.users)) {
    localStorage.setItem(STORAGE_KEYS.users, JSON.stringify(seedUsers));
  }
  if (!localStorage.getItem(STORAGE_KEYS.tasks)) {
    localStorage.setItem(STORAGE_KEYS.tasks, JSON.stringify(seedTasks));
  }
  if (!localStorage.getItem(STORAGE_KEYS.submissions)) {
    localStorage.setItem(STORAGE_KEYS.submissions, JSON.stringify(seedSubmissions));
  }
}
