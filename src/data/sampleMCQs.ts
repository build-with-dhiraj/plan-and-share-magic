export interface MCQ {
  id: string;
  question: string;
  statements?: string[];
  options: string[];
  correctIndex: number;
  explanation: string;
  topic: string;
  difficulty: "easy" | "medium" | "hard";
  source?: string;
  year?: string;
}

export const sampleMCQs: MCQ[] = [
  {
    id: "mcq-1",
    question: "Consider the following statements about the Reserve Bank of India (RBI):",
    statements: [
      "RBI was established based on the recommendations of the Hilton Young Commission.",
      "RBI was nationalized in 1949.",
      "RBI acts as the banker to the State Governments by compulsion."
    ],
    options: [
      "1 and 2 only",
      "2 and 3 only",
      "1 and 3 only",
      "1, 2 and 3"
    ],
    correctIndex: 0,
    explanation: "RBI was established in 1935 based on the Hilton Young Commission (1926) recommendations and was nationalized in 1949. However, RBI acts as banker to State Governments by agreement, not compulsion — states must enter into an agreement with RBI.",
    topic: "Economy",
    difficulty: "medium",
    source: "UPSC 2019"
  },
  {
    id: "mcq-2",
    question: "Which of the following is/are the function(s) of the NITI Aayog?",
    statements: [
      "To foster cooperative federalism through structured support initiatives and mechanisms with the States.",
      "To allocate funds to States and Union Territories.",
      "To develop mechanisms to formulate credible plans at the village level."
    ],
    options: [
      "1 only",
      "1 and 3 only",
      "2 and 3 only",
      "1, 2 and 3"
    ],
    correctIndex: 1,
    explanation: "NITI Aayog fosters cooperative federalism and develops mechanisms for village-level planning. Unlike the erstwhile Planning Commission, NITI Aayog does NOT allocate funds — that function rests with the Finance Commission and the Finance Ministry.",
    topic: "Polity",
    difficulty: "medium",
    source: "UPSC 2017"
  },
  {
    id: "mcq-3",
    question: "With reference to the Indian Ocean Dipole (IOD), consider the following statements:",
    statements: [
      "A positive IOD leads to greater rainfall in the Indian subcontinent.",
      "IOD is an irregular oscillation of sea-surface temperatures between the western and eastern Indian Ocean.",
      "IOD was first identified by Japanese researchers in 1999."
    ],
    options: [
      "1 and 2 only",
      "2 only",
      "1 and 3 only",
      "1, 2 and 3"
    ],
    correctIndex: 3,
    explanation: "All three statements are correct. A positive IOD (warmer western Indian Ocean) enhances moisture supply to India, boosting monsoon rainfall. IOD is an irregular oscillation of SSTs first identified by Saji et al. in 1999.",
    topic: "Geography",
    difficulty: "hard"
  },
  {
    id: "mcq-4",
    question: "Which of the following best describes 'Green Bonds'?",
    statements: [],
    options: [
      "Bonds issued by municipal corporations for urban development",
      "Bonds specifically earmarked to raise money for climate and environmental projects",
      "Bonds issued exclusively by the World Bank for developing countries",
      "Bonds that fund only renewable energy projects"
    ],
    correctIndex: 1,
    explanation: "Green Bonds are fixed-income instruments specifically earmarked to raise money for climate and environmental projects. They can be issued by governments, corporations, or multilateral institutions and fund a variety of green projects, not just renewable energy.",
    topic: "Economy",
    difficulty: "easy"
  },
  {
    id: "mcq-5",
    question: "Consider the following statements about the Fundamental Rights under the Indian Constitution:",
    statements: [
      "Article 15 prohibits discrimination on grounds of religion, race, caste, sex, or place of birth.",
      "Article 19 guarantees six freedoms to all persons residing in India.",
      "Right to Property is a Fundamental Right under Part III."
    ],
    options: [
      "1 only",
      "1 and 2 only",
      "2 and 3 only",
      "1, 2 and 3"
    ],
    correctIndex: 0,
    explanation: "Only Statement 1 is correct. Article 19 guarantees six freedoms to citizens only (not all persons). Right to Property was removed from Fundamental Rights by the 44th Amendment (1978) and is now a legal right under Article 300A.",
    topic: "Polity",
    difficulty: "medium",
    source: "UPSC 2020"
  },
  {
    id: "mcq-6",
    question: "The term 'Carbon Border Adjustment Mechanism (CBAM)' is associated with:",
    statements: [],
    options: [
      "India's climate action plan under the Paris Agreement",
      "European Union's mechanism to put a carbon price on imports",
      "A UNFCCC fund for climate adaptation in developing nations",
      "Carbon trading between BRICS nations"
    ],
    correctIndex: 1,
    explanation: "CBAM is the European Union's mechanism that puts a fair price on the carbon emitted during the production of carbon-intensive goods entering the EU. It aims to prevent 'carbon leakage' where production shifts to countries with laxer climate policies.",
    topic: "Environment",
    difficulty: "medium"
  },
  {
    id: "mcq-7",
    question: "Consider the following statements about the India-Middle East-Europe Economic Corridor (IMEC):",
    statements: [
      "It was announced during the G20 Summit under India's presidency.",
      "It includes both a railway and a shipping route.",
      "Saudi Arabia is one of the participating countries."
    ],
    options: [
      "1 and 3 only",
      "2 and 3 only",
      "1 only",
      "1, 2 and 3"
    ],
    correctIndex: 3,
    explanation: "All statements are correct. IMEC was announced at the 2023 G20 New Delhi Summit. It comprises an Eastern Corridor (India to Arabian Gulf) and a Northern Corridor (Arabian Gulf to Europe), involving both rail and shipping links. Saudi Arabia, UAE, Israel, Jordan, and EU nations are participants.",
    topic: "IR",
    difficulty: "medium"
  },
  {
    id: "mcq-8",
    question: "Which of the following technologies is used in India's Gaganyaan mission for crew safety?",
    statements: [],
    options: [
      "Crew Escape System (CES)",
      "Heat Shield Ablation Technology only",
      "Ion propulsion engines",
      "Solar sail navigation"
    ],
    correctIndex: 0,
    explanation: "The Crew Escape System (CES) is a critical safety feature of the Gaganyaan mission. It is designed to quickly pull the crew module away from the launch vehicle in case of emergency during the launch phase. ISRO successfully tested the CES in pad abort tests.",
    topic: "Science",
    difficulty: "easy"
  },
  {
    id: "mcq-9",
    question: "With reference to the Scheduled Tribes and Other Traditional Forest Dwellers (Recognition of Forest Rights) Act, 2006, consider the following:",
    statements: [
      "It recognizes both individual and community forest rights.",
      "The Gram Sabha is the authority to initiate the process for determining forest rights.",
      "It applies only to Reserved Forests and not to Protected Areas."
    ],
    options: [
      "1 and 2 only",
      "2 and 3 only",
      "1 only",
      "1, 2 and 3"
    ],
    correctIndex: 0,
    explanation: "The FRA recognizes both individual forest rights (for habitation, cultivation) and community forest rights (over common property resources). The Gram Sabha is the key authority. However, it applies to all forest lands including Reserved Forests, Protected Forests, and even National Parks and Wildlife Sanctuaries.",
    topic: "Environment",
    difficulty: "hard",
    source: "UPSC 2018"
  },
  {
    id: "mcq-10",
    question: "The 'Doctrine of Eclipse' in Indian constitutional law means:",
    statements: [],
    options: [
      "A law becomes void permanently if it violates Fundamental Rights",
      "Pre-constitutional laws inconsistent with Fundamental Rights are not dead but remain eclipsed",
      "Parliament can override any judicial decision by passing a new law",
      "The President can suspend Fundamental Rights during emergencies"
    ],
    correctIndex: 1,
    explanation: "The Doctrine of Eclipse states that pre-constitutional laws that are inconsistent with Fundamental Rights are not null and void ab initio. They are merely eclipsed (overshadowed) by the Fundamental Right and remain dormant. If the eclipsing provision is removed (e.g., by amendment), the law revives automatically.",
    topic: "Polity",
    difficulty: "hard"
  },
  {
    id: "mcq-11",
    question: "Consider the following about the Asian Infrastructure Investment Bank (AIIB):",
    statements: [
      "India is a founding member of AIIB.",
      "AIIB is headquartered in Beijing, China.",
      "India is the largest shareholder in AIIB."
    ],
    options: [
      "1 and 2 only",
      "1 only",
      "2 and 3 only",
      "1, 2 and 3"
    ],
    correctIndex: 0,
    explanation: "India is a founding member and AIIB is headquartered in Beijing. However, China is the largest shareholder (~26.6% voting power), followed by India (~7.6%). India is the second-largest shareholder, not the largest.",
    topic: "Economy",
    difficulty: "easy"
  },
  {
    id: "mcq-12",
    question: "The Siachen Glacier is situated in:",
    statements: [],
    options: [
      "Karakoram Range",
      "Pir Panjal Range",
      "Zanskar Range",
      "Greater Himalayan Range"
    ],
    correctIndex: 0,
    explanation: "The Siachen Glacier, the longest glacier in the Karakoram Range, is situated in the eastern Karakoram range in the Himalayan region. It is the world's highest battlefield and is strategically located between the Line of Control with Pakistan and the Line of Actual Control with China.",
    topic: "Geography",
    difficulty: "easy"
  },
];
