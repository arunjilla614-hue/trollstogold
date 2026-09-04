/**
 * Demo mode mock data.
 * Returns realistic-looking responses with the exact same schema as live mode.
 * Used when DEMO_MODE=true so the frontend can develop without real credentials.
 */

import { AnalysisResult, Reply, Strategy, YouTubeCommentsResult, MultiToneResponse } from '../types';

export const DEMO_ANALYSIS_RESULT: AnalysisResult = {
  toxicity: {
    score: 74,
    label: 'toxic',
    severity: 'medium',
    reason:
      'The comment uses dismissive and insulting language targeting the creator\'s content quality without constructive intent.',
  },
  intent: {
    type: 'playful_trolling',
    confidence: 0.87,
    reason:
      'The emoji usage and hyperbolic phrasing suggest the commenter is engaging in performative trolling rather than genuine criticism.',
  },
  strategy: {
    recommended: 'comedian_comeback',
    reason:
      'The playful nature of the troll provides excellent opportunity for a witty, high-engagement comeback that can win the audience over.',
  },
};

export function DEMO_REPLIES(strategy: Strategy): Reply[] {
  const replyMap: Record<Strategy, Reply[]> = {
    comedian_comeback: [
      {
        id: 'reply_1',
        text: "Thanks for the feedback! I've already hired my garbage as a co-writer — at least it has better ideas than your comment. 😂",
        style: 'comedian_comeback',
        gold_potential: 91,
      },
      {
        id: 'reply_2',
        text: "Garbage? My analytics disagree, but I appreciate you taking time out of your busy schedule of not creating anything to let me know. 🎤",
        style: 'comedian_comeback',
        gold_potential: 87,
      },
      {
        id: 'reply_3',
        text: "This comment is now the most entertaining thing on my channel. Thanks for the content boost! 🙏",
        style: 'comedian_comeback',
        gold_potential: 84,
      },
    ],
    shakespearean_roast: [
      {
        id: 'reply_1',
        text: "Hark! What manner of base creature doth emerge from the digital ether to bestow upon us such pearls of wisdom? Begone, thou spleeny hedge-pig!",
        style: 'shakespearean_roast',
        gold_potential: 89,
      },
      {
        id: 'reply_2',
        text: "Methinks the critic doth protest too much, yet produceth nothing of merit themselves. A pox upon such idle commentary!",
        style: 'shakespearean_roast',
        gold_potential: 85,
      },
      {
        id: 'reply_3',
        text: "Thou art as loathsome as a toad, yet the toad at least hath the decency to remain silent.",
        style: 'shakespearean_roast',
        gold_potential: 82,
      },
    ],
    sarcastic_hr: [
      {
        id: 'reply_1',
        text: "Thank you for your feedback! Per our Content Quality Policy, we've logged your concern and will address it in Q4 2045. Have a productive day! 😊",
        style: 'sarcastic_hr',
        gold_potential: 88,
      },
      {
        id: 'reply_2',
        text: "We appreciate you taking time to share your thoughts. Your feedback has been noted, categorized, and placed in our Valuable Insights folder. (It's the recycling bin.)",
        style: 'sarcastic_hr',
        gold_potential: 85,
      },
      {
        id: 'reply_3',
        text: "Per our community guidelines, we're required to respond to all feedback with equal enthusiasm. So: WOW, AMAZING COMMENT, VERY INSIGHTFUL. 📋",
        style: 'sarcastic_hr',
        gold_potential: 80,
      },
    ],
    clout_booster: [
      {
        id: 'reply_1',
        text: "Legend. This is the kind of engagement that keeps me going. See you in the next video! 🔥",
        style: 'clout_booster',
        gold_potential: 86,
      },
      {
        id: 'reply_2',
        text: "Even the haters are watching — that's how you know the content hits different. Thanks for the algorithm boost! 📈",
        style: 'clout_booster',
        gold_potential: 83,
      },
      {
        id: 'reply_3',
        text: "I make content for the 99%. The 1% can keep commenting — every reply is engagement. Let's gooo! 💪",
        style: 'clout_booster',
        gold_potential: 79,
      },
    ],
    kind_redirect: [
      {
        id: 'reply_1',
        text: "Hey, I hear you! What specifically didn't work for you? I'm always looking to improve and genuine feedback actually helps. 🙏",
        style: 'kind_redirect',
        gold_potential: 72,
      },
      {
        id: 'reply_2',
        text: "Thanks for watching! If there's a specific topic you'd love to see covered better, drop it below — I take suggestions seriously.",
        style: 'kind_redirect',
        gold_potential: 68,
      },
      {
        id: 'reply_3',
        text: "Sorry it didn't land for you. Every creator is on a journey — I'd love to know what content would resonate more with you.",
        style: 'kind_redirect',
        gold_potential: 65,
      },
    ],
    ignore: [],
  };

  return replyMap[strategy] ?? replyMap['comedian_comeback'];
}

export const DEMO_YOUTUBE_COMMENTS: YouTubeCommentsResult = {
  video: {
    videoId: 'dQw4w9WgXcQ',
    title: 'Demo Video — TrollToGold Test',
    channelTitle: 'Demo Creator',
  },
  comments: [
    {
      id: 'demo_comment_1',
      author: 'TrollMaster9000',
      text: 'Bro really thought this was a good idea 💀',
      likeCount: 142,
      publishedAt: '2024-10-15T10:30:00Z',
    },
    {
      id: 'demo_comment_2',
      author: 'HonestViewer',
      text: 'This is the worst video I\'ve ever watched.',
      likeCount: 34,
      publishedAt: '2024-10-14T08:15:00Z',
    },
    {
      id: 'demo_comment_3',
      author: 'FactChecker99',
      text: 'Actually, this information is factually incorrect because the study you cited was debunked in 2023. Here\'s the source:',
      likeCount: 287,
      publishedAt: '2024-10-13T16:45:00Z',
    },
    {
      id: 'demo_comment_4',
      author: 'CasualViewer',
      text: "Nobody asked for your opinion.",
      likeCount: 12,
      publishedAt: '2024-10-12T12:00:00Z',
    },
    {
      id: 'demo_comment_5',
      author: 'EditingCritic',
      text: 'Your editing skills are nonexistent 😂',
      likeCount: 89,
      publishedAt: '2024-10-11T09:20:00Z',
    },
    {
      id: 'demo_comment_6',
      author: 'RealFan',
      text: 'This is genuinely one of the best videos on the topic. Keep it up!',
      likeCount: 521,
      publishedAt: '2024-10-10T20:10:00Z',
    },
    {
      id: 'demo_comment_7',
      author: 'SarcasticSam',
      text: 'Oh wow, AMAZING content 🙄 10/10 would never watch again',
      likeCount: 67,
      publishedAt: '2024-10-09T14:30:00Z',
    },
    {
      id: 'demo_comment_8',
      author: 'SpamBot3000',
      text: 'CHECK OUT MY CHANNEL FOR FREE SUBS! SUBSCRIBE NOW!!!',
      likeCount: 0,
      publishedAt: '2024-10-08T11:00:00Z',
    },
  ],
};

// -----------------------------------------------------------
// Multi-Tone Demo Response
// -----------------------------------------------------------

export const DEMO_MULTI_TONE_RESPONSE: MultiToneResponse = {
  safetyNote: null,
  suggestions: [
    {
      tone: 'Witty',
      emoji: '😂',
      reply: "Took time out of your day to write this masterpiece, so honestly, you're welcome for the inspiration! 😄",
      goldScore: 88,
    },
    {
      tone: 'Sarcastic',
      emoji: '😏',
      reply: "Wow, a scathing critique from someone who clearly has way too much time on their hands. Noted. 🙄",
      goldScore: 81,
    },
    {
      tone: 'Professional',
      emoji: '💼',
      reply: "Thank you for the feedback. I'm always looking to improve and take all perspectives into account.",
      goldScore: 73,
    },
    {
      tone: 'Savage',
      emoji: '🔥',
      reply: "Bold of you to assume this bothers me. Thanks for boosting my engagement though! 😎",
      goldScore: 92,
    },
    {
      tone: 'Kind',
      emoji: '❤️',
      reply: "I appreciate you engaging with the content! If there's something specific I can improve, I'm always open to hearing it.",
      goldScore: 67,
    },
    {
      tone: 'Clout Booster',
      emoji: '🚀',
      reply: "Debate me in the comments — who's actually right here? 👇 Let's get the community talking!",
      goldScore: 85,
    },
  ],
};
