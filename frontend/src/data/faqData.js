export const faqData = {
  general: [
    {
      question: "How do I create a tournament?",
      answer: "To create a tournament, click on the 'Create Tournament' button from your dashboard or the tournaments page. Fill in the tournament details including name, game, format, entry fee, and start time. Once created, you can share the tournament link with other players.",
      tags: ["tournament", "create", "setup"]
    },
    {
      question: "How does the payment system work?",
      answer: "We use a secure wallet system. You need to deposit funds into your wallet before joining paid tournaments. When you join a tournament, the entry fee is deducted from your wallet. Winnings are automatically credited to your wallet after tournament completion.",
      tags: ["payment", "wallet", "deposit"]
    },
    // ... more FAQs
  ],
  // ... other categories
};

export const searchFAQs = (query) => {
  const results = [];
  const lowerQuery = query.toLowerCase();
  
  Object.entries(faqData).forEach(([category, faqs]) => {
    faqs.forEach(faq => {
      if (
        faq.question.toLowerCase().includes(lowerQuery) ||
        faq.answer.toLowerCase().includes(lowerQuery) ||
        faq.tags.some(tag => tag.toLowerCase().includes(lowerQuery))
      ) {
        results.push({
          ...faq,
          category
        });
      }
    });
  });
  
  return results;
};