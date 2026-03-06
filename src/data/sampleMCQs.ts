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
  timeLimit?: number; // seconds, default 60
}

export const sampleMCQs: MCQ[] = [
  // ── ECONOMY ──
  {
    id: "mcq-1",
    question: "Consider the following statements about the Reserve Bank of India (RBI):",
    statements: [
      "RBI was established based on the recommendations of the Hilton Young Commission.",
      "RBI was nationalized in 1949.",
      "RBI acts as the banker to the State Governments by compulsion."
    ],
    options: ["1 and 2 only", "2 and 3 only", "1 and 3 only", "1, 2 and 3"],
    correctIndex: 0,
    explanation: "RBI was established in 1935 based on the Hilton Young Commission (1926) recommendations and was nationalized in 1949. However, RBI acts as banker to State Governments by agreement, not compulsion.",
    topic: "Economy",
    difficulty: "medium",
    source: "UPSC 2019"
  },
  {
    id: "mcq-4",
    question: "Which of the following best describes 'Green Bonds'?",
    options: [
      "Bonds issued by municipal corporations for urban development",
      "Bonds specifically earmarked to raise money for climate and environmental projects",
      "Bonds issued exclusively by the World Bank for developing countries",
      "Bonds that fund only renewable energy projects"
    ],
    correctIndex: 1,
    explanation: "Green Bonds are fixed-income instruments specifically earmarked to raise money for climate and environmental projects. They can be issued by governments, corporations, or multilateral institutions.",
    topic: "Economy",
    difficulty: "easy"
  },
  {
    id: "mcq-11",
    question: "Consider the following about the Asian Infrastructure Investment Bank (AIIB):",
    statements: [
      "India is a founding member of AIIB.",
      "AIIB is headquartered in Beijing, China.",
      "India is the largest shareholder in AIIB."
    ],
    options: ["1 and 2 only", "1 only", "2 and 3 only", "1, 2 and 3"],
    correctIndex: 0,
    explanation: "India is a founding member and AIIB is headquartered in Beijing. However, China is the largest shareholder (~26.6% voting power), followed by India (~7.6%).",
    topic: "Economy",
    difficulty: "easy"
  },
  {
    id: "econ-4",
    question: "The term 'Current Account Deficit' refers to:",
    options: [
      "Excess of government expenditure over revenue",
      "Excess of imports of goods, services, and transfers over exports",
      "Deficit in the capital account of the balance of payments",
      "Shortfall in tax revenue collection"
    ],
    correctIndex: 1,
    explanation: "Current Account Deficit (CAD) occurs when the total imports of goods, services, and transfers exceed total exports. It is a key indicator of a country's external trade position.",
    topic: "Economy",
    difficulty: "easy"
  },
  {
    id: "econ-5",
    question: "Consider the following statements about the Goods and Services Tax (GST):",
    statements: [
      "GST was introduced through the 101st Constitutional Amendment.",
      "GST subsumes excise duty, service tax, and VAT.",
      "GST Council is a constitutional body headed by the Prime Minister."
    ],
    options: ["1 and 2 only", "2 and 3 only", "1 and 3 only", "1, 2 and 3"],
    correctIndex: 0,
    explanation: "GST was introduced by the 101st Amendment (2016) and subsumes multiple indirect taxes. The GST Council is headed by the Union Finance Minister, not the Prime Minister.",
    topic: "Economy",
    difficulty: "medium"
  },

  // ── POLITY ──
  {
    id: "mcq-2",
    question: "Which of the following is/are the function(s) of the NITI Aayog?",
    statements: [
      "To foster cooperative federalism through structured support initiatives and mechanisms with the States.",
      "To allocate funds to States and Union Territories.",
      "To develop mechanisms to formulate credible plans at the village level."
    ],
    options: ["1 only", "1 and 3 only", "2 and 3 only", "1, 2 and 3"],
    correctIndex: 1,
    explanation: "NITI Aayog fosters cooperative federalism and develops village-level planning mechanisms. Unlike the Planning Commission, NITI Aayog does NOT allocate funds.",
    topic: "Polity",
    difficulty: "medium",
    source: "UPSC 2017"
  },
  {
    id: "mcq-5",
    question: "Consider the following statements about Fundamental Rights:",
    statements: [
      "Article 15 prohibits discrimination on grounds of religion, race, caste, sex, or place of birth.",
      "Article 19 guarantees six freedoms to all persons residing in India.",
      "Right to Property is a Fundamental Right under Part III."
    ],
    options: ["1 only", "1 and 2 only", "2 and 3 only", "1, 2 and 3"],
    correctIndex: 0,
    explanation: "Only Statement 1 is correct. Article 19 guarantees six freedoms to citizens only. Right to Property was removed from Fundamental Rights by the 44th Amendment (1978).",
    topic: "Polity",
    difficulty: "medium",
    source: "UPSC 2020"
  },
  {
    id: "mcq-10",
    question: "The 'Doctrine of Eclipse' in Indian constitutional law means:",
    options: [
      "A law becomes void permanently if it violates Fundamental Rights",
      "Pre-constitutional laws inconsistent with Fundamental Rights are not dead but remain eclipsed",
      "Parliament can override any judicial decision by passing a new law",
      "The President can suspend Fundamental Rights during emergencies"
    ],
    correctIndex: 1,
    explanation: "The Doctrine of Eclipse states that pre-constitutional laws inconsistent with Fundamental Rights are merely eclipsed and remain dormant. If the eclipsing provision is removed, the law revives.",
    topic: "Polity",
    difficulty: "hard"
  },
  {
    id: "pol-4",
    question: "Which of the following writs is known as the 'bulwark of personal freedom'?",
    options: ["Mandamus", "Habeas Corpus", "Certiorari", "Quo Warranto"],
    correctIndex: 1,
    explanation: "Habeas Corpus literally means 'to have the body.' It is the most important writ for personal liberty, used against illegal detention by state or private individuals.",
    topic: "Polity",
    difficulty: "easy"
  },
  {
    id: "pol-5",
    question: "The 73rd Constitutional Amendment is related to:",
    options: [
      "Municipalities",
      "Panchayati Raj Institutions",
      "Cooperative Societies",
      "Tribunals"
    ],
    correctIndex: 1,
    explanation: "The 73rd Amendment (1992) gave constitutional status to Panchayati Raj Institutions (PRIs) by adding Part IX to the Constitution. The 74th Amendment deals with Municipalities.",
    topic: "Polity",
    difficulty: "easy"
  },

  // ── GEOGRAPHY ──
  {
    id: "mcq-3",
    question: "With reference to the Indian Ocean Dipole (IOD), consider the following statements:",
    statements: [
      "A positive IOD leads to greater rainfall in the Indian subcontinent.",
      "IOD is an irregular oscillation of sea-surface temperatures between the western and eastern Indian Ocean.",
      "IOD was first identified by Japanese researchers in 1999."
    ],
    options: ["1 and 2 only", "2 only", "1 and 3 only", "1, 2 and 3"],
    correctIndex: 3,
    explanation: "All three statements are correct. A positive IOD enhances moisture supply to India, boosting monsoon rainfall. IOD was first identified by Saji et al. in 1999.",
    topic: "Geography",
    difficulty: "hard"
  },
  {
    id: "mcq-12",
    question: "The Siachen Glacier is situated in:",
    options: ["Karakoram Range", "Pir Panjal Range", "Zanskar Range", "Greater Himalayan Range"],
    correctIndex: 0,
    explanation: "The Siachen Glacier is situated in the eastern Karakoram range. It is the world's highest battlefield, strategically located between the LoC with Pakistan and LAC with China.",
    topic: "Geography",
    difficulty: "easy"
  },
  {
    id: "geo-3",
    question: "Which of the following rivers does NOT originate in Indian territory?",
    options: ["Brahmaputra", "Ganga", "Godavari", "Narmada"],
    correctIndex: 0,
    explanation: "The Brahmaputra originates near Lake Mansarovar in Tibet (China) as the Tsangpo. It enters India through Arunachal Pradesh. All other listed rivers originate within India.",
    topic: "Geography",
    difficulty: "easy"
  },
  {
    id: "geo-4",
    question: "Consider the following about the Western Ghats:",
    statements: [
      "They are older than the Himalayan mountain range.",
      "They are a UNESCO World Heritage Site.",
      "They receive rainfall primarily from the Southwest monsoon."
    ],
    options: ["1 and 2 only", "2 and 3 only", "1 and 3 only", "1, 2 and 3"],
    correctIndex: 3,
    explanation: "All correct. The Western Ghats are older than the Himalayas (formed during the break-up of Gondwana ~150 MYA), are a UNESCO World Heritage Site (2012), and receive heavy orographic rainfall from the Southwest monsoon.",
    topic: "Geography",
    difficulty: "medium"
  },
  {
    id: "geo-5",
    question: "The '9-degree channel' separates:",
    options: [
      "Andaman and Nicobar Islands",
      "Lakshadweep and Minicoy",
      "India and Sri Lanka",
      "Maldives and Lakshadweep"
    ],
    correctIndex: 1,
    explanation: "The 9-degree channel separates Lakshadweep Islands from Minicoy Island. The 10-degree channel separates Andaman from Nicobar. The Palk Strait separates India from Sri Lanka.",
    topic: "Geography",
    difficulty: "medium"
  },

  // ── ENVIRONMENT ──
  {
    id: "mcq-6",
    question: "The term 'Carbon Border Adjustment Mechanism (CBAM)' is associated with:",
    options: [
      "India's climate action plan under the Paris Agreement",
      "European Union's mechanism to put a carbon price on imports",
      "A UNFCCC fund for climate adaptation in developing nations",
      "Carbon trading between BRICS nations"
    ],
    correctIndex: 1,
    explanation: "CBAM is the EU's mechanism that puts a fair price on carbon emitted during production of carbon-intensive goods entering the EU, preventing 'carbon leakage.'",
    topic: "Environment",
    difficulty: "medium"
  },
  {
    id: "mcq-9",
    question: "With reference to the Forest Rights Act, 2006:",
    statements: [
      "It recognizes both individual and community forest rights.",
      "The Gram Sabha is the authority to initiate the process for determining forest rights.",
      "It applies only to Reserved Forests and not to Protected Areas."
    ],
    options: ["1 and 2 only", "2 and 3 only", "1 only", "1, 2 and 3"],
    correctIndex: 0,
    explanation: "The FRA recognizes both individual and community forest rights. The Gram Sabha is the key authority. It applies to all forest lands including National Parks and Wildlife Sanctuaries.",
    topic: "Environment",
    difficulty: "hard",
    source: "UPSC 2018"
  },
  {
    id: "env-3",
    question: "The Ramsar Convention is associated with the conservation of:",
    options: ["Endangered species", "Wetlands", "Ozone layer", "Tropical forests"],
    correctIndex: 1,
    explanation: "The Ramsar Convention (1971) is an international treaty for the conservation and sustainable use of wetlands. India has designated multiple Ramsar sites across the country.",
    topic: "Environment",
    difficulty: "easy"
  },
  {
    id: "env-4",
    question: "Which of the following is NOT a greenhouse gas?",
    options: ["Nitrogen", "Methane", "Nitrous Oxide", "Water Vapour"],
    correctIndex: 0,
    explanation: "Nitrogen (N₂) makes up ~78% of the atmosphere but is not a greenhouse gas. Methane, nitrous oxide, and water vapour are all greenhouse gases that trap heat.",
    topic: "Environment",
    difficulty: "easy"
  },
  {
    id: "env-5",
    question: "Consider the following about the National Green Tribunal (NGT):",
    statements: [
      "It was established under the National Green Tribunal Act, 2010.",
      "It has the power to hear all civil cases relating to environmental issues.",
      "Its decisions are binding and can only be challenged in the Supreme Court."
    ],
    options: ["1 and 3 only", "1 and 2 only", "2 and 3 only", "1, 2 and 3"],
    correctIndex: 0,
    explanation: "NGT was established in 2010. It handles only cases under specific environmental laws (not all civil cases). Its decisions can only be challenged in the Supreme Court within 90 days.",
    topic: "Environment",
    difficulty: "medium"
  },

  // ── IR (International Relations) ──
  {
    id: "mcq-7",
    question: "Consider the following about IMEC:",
    statements: [
      "It was announced during the G20 Summit under India's presidency.",
      "It includes both a railway and a shipping route.",
      "Saudi Arabia is one of the participating countries."
    ],
    options: ["1 and 3 only", "2 and 3 only", "1 only", "1, 2 and 3"],
    correctIndex: 3,
    explanation: "All correct. IMEC was announced at the 2023 G20 New Delhi Summit. It comprises rail and shipping links with Saudi Arabia, UAE, Israel, Jordan, and EU nations as participants.",
    topic: "IR",
    difficulty: "medium"
  },
  {
    id: "ir-2",
    question: "The 'Quad' grouping consists of:",
    options: [
      "India, USA, China, Japan",
      "India, USA, Australia, Japan",
      "India, UK, Australia, Japan",
      "India, USA, Australia, France"
    ],
    correctIndex: 1,
    explanation: "The Quadrilateral Security Dialogue (Quad) consists of India, USA, Australia, and Japan. It focuses on a free and open Indo-Pacific region.",
    topic: "IR",
    difficulty: "easy"
  },
  {
    id: "ir-3",
    question: "Which organization administers the 'Most Favoured Nation' (MFN) principle?",
    options: ["United Nations", "World Trade Organization", "International Monetary Fund", "World Bank"],
    correctIndex: 1,
    explanation: "The MFN principle is a cornerstone of the WTO system. It requires that any trade advantage given to one WTO member must be extended to all other members.",
    topic: "IR",
    difficulty: "easy"
  },
  {
    id: "ir-4",
    question: "Consider the following about BRICS:",
    statements: [
      "BRICS was originally BRIC, with South Africa joining in 2010.",
      "The New Development Bank (NDB) was established by BRICS nations.",
      "BRICS expanded to include new members in 2024."
    ],
    options: ["1 and 2 only", "2 and 3 only", "1 only", "1, 2 and 3"],
    correctIndex: 3,
    explanation: "All correct. South Africa joined BRIC in 2010, making it BRICS. The NDB was established in 2014. In 2024, Egypt, Ethiopia, Iran, Saudi Arabia, and UAE joined as new members.",
    topic: "IR",
    difficulty: "medium"
  },
  {
    id: "ir-5",
    question: "The International Court of Justice (ICJ) is located in:",
    options: ["New York", "Geneva", "The Hague", "Vienna"],
    correctIndex: 2,
    explanation: "The ICJ, the principal judicial organ of the United Nations, is located in The Hague, Netherlands. It settles legal disputes between states and gives advisory opinions.",
    topic: "IR",
    difficulty: "easy"
  },

  // ── SCIENCE ──
  {
    id: "mcq-8",
    question: "Which technology is used in India's Gaganyaan mission for crew safety?",
    options: [
      "Crew Escape System (CES)",
      "Heat Shield Ablation Technology only",
      "Ion propulsion engines",
      "Solar sail navigation"
    ],
    correctIndex: 0,
    explanation: "The Crew Escape System (CES) quickly pulls the crew module away from the launch vehicle in emergencies. ISRO successfully tested it in pad abort tests.",
    topic: "Science",
    difficulty: "easy"
  },
  {
    id: "sci-2",
    question: "CRISPR-Cas9 technology is primarily used for:",
    options: [
      "Quantum computing",
      "Gene editing",
      "Nuclear fusion",
      "Satellite communication"
    ],
    correctIndex: 1,
    explanation: "CRISPR-Cas9 is a revolutionary gene-editing tool that allows precise modification of DNA sequences. It has applications in medicine, agriculture, and biotechnology.",
    topic: "Science",
    difficulty: "easy"
  },
  {
    id: "sci-3",
    question: "Consider the following about India's Chandrayaan-3 mission:",
    statements: [
      "It achieved a soft landing near the lunar South Pole.",
      "The rover deployed was named 'Pragyan'.",
      "It was launched by PSLV."
    ],
    options: ["1 and 2 only", "2 and 3 only", "1 only", "1, 2 and 3"],
    correctIndex: 0,
    explanation: "Chandrayaan-3 achieved a historic soft landing near the lunar South Pole in August 2023 and deployed the Pragyan rover. It was launched by LVM3 (GSLV Mk III), not PSLV.",
    topic: "Science",
    difficulty: "medium"
  },
  {
    id: "sci-4",
    question: "Which of the following is a quantum-resistant cryptographic approach?",
    options: [
      "RSA encryption",
      "Lattice-based cryptography",
      "SHA-256 hashing",
      "Diffie-Hellman key exchange"
    ],
    correctIndex: 1,
    explanation: "Lattice-based cryptography is considered quantum-resistant as it relies on mathematical problems that quantum computers cannot efficiently solve, unlike RSA or Diffie-Hellman.",
    topic: "Science",
    difficulty: "hard"
  },
  {
    id: "sci-5",
    question: "The Aditya-L1 mission is India's first space-based observatory to study:",
    options: ["Mars", "The Sun", "Jupiter", "Asteroids"],
    correctIndex: 1,
    explanation: "Aditya-L1 is India's first dedicated solar mission, placed at the L1 Lagrange point to continuously observe the Sun and study solar winds, flares, and coronal mass ejections.",
    topic: "Science",
    difficulty: "easy"
  },

  // ── HISTORY ──
  {
    id: "his-1",
    question: "The Revolt of 1857 started from which of the following places?",
    options: ["Delhi", "Kanpur", "Meerut", "Lucknow"],
    correctIndex: 2,
    explanation: "The Revolt of 1857 began on 10 May 1857 at Meerut when Indian sepoys refused to use the new Enfield rifles with greased cartridges and marched to Delhi to restore Mughal emperor Bahadur Shah Zafar.",
    topic: "History",
    difficulty: "easy"
  },
  {
    id: "his-2",
    question: "The Cabinet Mission Plan (1946) proposed:",
    options: [
      "Partition of India into India and Pakistan",
      "A three-tier federal structure for a united India",
      "Complete independence with immediate British withdrawal",
      "Dominion status for India within the British Commonwealth"
    ],
    correctIndex: 1,
    explanation: "The Cabinet Mission (1946) proposed a three-tier structure: Union, Groups of Provinces, and Provinces — rejecting the demand for Pakistan while giving Muslim-majority provinces grouping options.",
    topic: "History",
    difficulty: "medium",
    source: "UPSC 2015"
  },
  {
    id: "his-3",
    question: "Consider the following about the Permanent Settlement (1793):",
    statements: [
      "It was introduced by Lord Cornwallis.",
      "It fixed the land revenue to be paid by zamindars permanently.",
      "It was introduced across all of British India."
    ],
    options: ["1 and 2 only", "2 and 3 only", "1 only", "1, 2 and 3"],
    correctIndex: 0,
    explanation: "Lord Cornwallis introduced the Permanent Settlement in 1793 in Bengal, Bihar, and Odisha. It permanently fixed the revenue to be paid by zamindars but was NOT implemented across all of British India.",
    topic: "History",
    difficulty: "medium"
  },
  {
    id: "his-4",
    question: "The Dandi March of 1930 was associated with:",
    options: [
      "Non-Cooperation Movement",
      "Civil Disobedience Movement",
      "Quit India Movement",
      "Swadeshi Movement"
    ],
    correctIndex: 1,
    explanation: "The Dandi March (Salt March) of 1930 was part of the Civil Disobedience Movement. Gandhi marched 390 km from Sabarmati Ashram to Dandi to break the salt law, sparking nationwide civil disobedience.",
    topic: "History",
    difficulty: "easy"
  },
  {
    id: "his-5",
    question: "The Mauryan administration is described in detail in which ancient text?",
    options: ["Arthashastra", "Indica", "Mudrarakshasa", "All of the above"],
    correctIndex: 3,
    explanation: "The Arthashastra by Kautilya, Indica by Megasthenes, and Mudrarakshasa by Vishakhadatta all provide detailed accounts of Mauryan administration, economy, and society.",
    topic: "History",
    difficulty: "medium"
  },
  {
    id: "his-6",
    question: "Who founded the Indian National Congress in 1885?",
    options: ["Dadabhai Naoroji", "A.O. Hume", "Surendranath Banerjee", "W.C. Bonnerjee"],
    correctIndex: 1,
    explanation: "Allan Octavian Hume, a retired British civil servant, founded the Indian National Congress in 1885. W.C. Bonnerjee was its first president. Dadabhai Naoroji was thrice president.",
    topic: "History",
    difficulty: "easy"
  },
  {
    id: "his-7",
    question: "The Ryotwari System of land revenue was primarily introduced in:",
    options: [
      "Bengal and Bihar",
      "Madras and Bombay",
      "Punjab and North-West Provinces",
      "Central Provinces"
    ],
    correctIndex: 1,
    explanation: "The Ryotwari System was introduced by Thomas Munro in Madras Presidency and Alexander Read in parts of Bombay. Under it, the cultivator (ryot) paid revenue directly to the government.",
    topic: "History",
    difficulty: "medium"
  },
  {
    id: "his-8",
    question: "Consider the following about the Gupta Period:",
    statements: [
      "It is often called the 'Golden Age' of Indian history.",
      "Aryabhata made significant contributions to mathematics and astronomy during this period.",
      "The decimal system was developed during the Gupta period."
    ],
    options: ["1 and 2 only", "2 and 3 only", "1 and 3 only", "1, 2 and 3"],
    correctIndex: 3,
    explanation: "All correct. The Gupta period (4th-6th century CE) is called the Golden Age for its achievements in science, art, and literature. Aryabhata's works and the decimal system emerged during this era.",
    topic: "History",
    difficulty: "easy"
  },
  {
    id: "his-9",
    question: "The Khilafat Movement (1919-1924) was primarily launched to:",
    options: [
      "Demand complete independence for India",
      "Protest against the dismemberment of the Ottoman Empire",
      "Oppose the Rowlatt Act",
      "Support the Non-Cooperation Movement"
    ],
    correctIndex: 1,
    explanation: "The Khilafat Movement was launched by Indian Muslims to protest against the harsh Treaty of Sèvres imposed on the Ottoman Empire after WWI. It merged with Gandhi's Non-Cooperation Movement.",
    topic: "History",
    difficulty: "medium"
  },
  {
    id: "his-10",
    question: "The Battle of Plassey (1757) was fought between:",
    options: [
      "British and Marathas",
      "British and Nawab of Bengal",
      "British and Mughal Emperor",
      "British and French"
    ],
    correctIndex: 1,
    explanation: "The Battle of Plassey (23 June 1757) was fought between the British East India Company led by Robert Clive and Siraj-ud-Daulah, the Nawab of Bengal. Mir Jafar's betrayal led to British victory.",
    topic: "History",
    difficulty: "easy"
  },

  // ── ETHICS ──
  {
    id: "eth-1",
    question: "In the context of public administration, 'conflict of interest' refers to:",
    options: [
      "Disagreement between two government departments",
      "A situation where personal interests clash with official duties",
      "Budget conflicts between center and state",
      "Ideological differences between political parties"
    ],
    correctIndex: 1,
    explanation: "Conflict of interest arises when a public servant's personal, financial, or other interests interfere with their ability to perform official duties impartially and objectively.",
    topic: "Ethics",
    difficulty: "easy"
  },
  {
    id: "eth-2",
    question: "Which of the following is NOT one of Mahatma Gandhi's seven social sins?",
    options: [
      "Wealth without work",
      "Pleasure without conscience",
      "Knowledge without character",
      "Power without accountability"
    ],
    correctIndex: 3,
    explanation: "Gandhi's seven social sins are: Wealth without work, Pleasure without conscience, Knowledge without character, Commerce without morality, Science without humanity, Religion without sacrifice, Politics without principle.",
    topic: "Ethics",
    difficulty: "medium"
  },
  {
    id: "eth-3",
    question: "The concept of 'Nishkama Karma' in the Bhagavad Gita means:",
    options: [
      "Action performed with desire for specific results",
      "Selfless action performed without attachment to results",
      "Complete inaction and renunciation of the world",
      "Action performed only for material gains"
    ],
    correctIndex: 1,
    explanation: "Nishkama Karma means selfless action without attachment to outcomes. The Gita teaches that one has a right to action but not to the fruits of action — a key ethical principle in Indian philosophy.",
    topic: "Ethics",
    difficulty: "easy"
  },
  {
    id: "eth-4",
    question: "Consider the following about the concept of 'Emotional Intelligence':",
    statements: [
      "It was popularized by Daniel Goleman.",
      "It includes self-awareness, self-regulation, and empathy.",
      "It is considered irrelevant in public administration."
    ],
    options: ["1 and 2 only", "2 and 3 only", "1 only", "1, 2 and 3"],
    correctIndex: 0,
    explanation: "Emotional Intelligence was popularized by Daniel Goleman and includes self-awareness, self-regulation, motivation, empathy, and social skills. It is highly relevant in public administration for effective governance.",
    topic: "Ethics",
    difficulty: "medium"
  },
  {
    id: "eth-5",
    question: "The Right to Information (RTI) Act enhances which ethical principle in governance?",
    options: ["Efficiency", "Transparency and accountability", "Hierarchy", "Confidentiality"],
    correctIndex: 1,
    explanation: "The RTI Act (2005) promotes transparency and accountability in governance by giving citizens the right to access government information, reducing corruption and improving governance.",
    topic: "Ethics",
    difficulty: "easy"
  },
  {
    id: "eth-6",
    question: "John Rawls' 'Veil of Ignorance' thought experiment is used to explain:",
    options: [
      "Utilitarian ethics",
      "The principle of justice as fairness",
      "Social Darwinism",
      "Libertarian freedom"
    ],
    correctIndex: 1,
    explanation: "Rawls' 'Veil of Ignorance' asks people to design a just society without knowing their own position in it. This leads to the principle of 'justice as fairness' — ensuring the most disadvantaged benefit.",
    topic: "Ethics",
    difficulty: "hard"
  },
  {
    id: "eth-7",
    question: "Which of the following is an example of 'whistleblowing' in the ethical context?",
    options: [
      "An employee filing a complaint about workplace hygiene",
      "A public servant exposing corruption within their organization",
      "A journalist reporting news from a press conference",
      "A citizen voting in elections"
    ],
    correctIndex: 1,
    explanation: "Whistleblowing refers to an insider exposing illegal, unethical, or corrupt activities within an organization. It involves significant personal risk and is protected under laws like the Whistleblowers Protection Act, 2014.",
    topic: "Ethics",
    difficulty: "easy"
  },
  {
    id: "eth-8",
    question: "The Categorical Imperative was proposed by:",
    options: ["Aristotle", "Immanuel Kant", "John Stuart Mill", "Jeremy Bentham"],
    correctIndex: 1,
    explanation: "The Categorical Imperative was proposed by Immanuel Kant. It states that one should act only according to rules that could become universal laws — a deontological approach to ethics.",
    topic: "Ethics",
    difficulty: "medium"
  },
  {
    id: "eth-9",
    question: "The concept of 'Dharma' in Indian ethical tradition primarily emphasizes:",
    options: [
      "Religious rituals only",
      "Duty, righteousness, and moral order",
      "Material prosperity",
      "Political power"
    ],
    correctIndex: 1,
    explanation: "Dharma in Indian tradition encompasses duty, righteousness, moral law, and cosmic order. It goes beyond religious rituals to include ethical conduct, social responsibility, and righteous living.",
    topic: "Ethics",
    difficulty: "easy"
  },
  {
    id: "eth-10",
    question: "Consider the following about the Code of Conduct for civil servants:",
    statements: [
      "It provides guidelines for maintaining integrity and impartiality.",
      "It is enforceable by law.",
      "It is based on the recommendations of the Santhanam Committee."
    ],
    options: ["1 and 3 only", "1 and 2 only", "2 and 3 only", "1, 2 and 3"],
    correctIndex: 0,
    explanation: "The Code of Conduct provides guidelines for integrity and impartiality and draws from the Santhanam Committee (1964) recommendations. However, it is primarily administrative guidance, not directly enforceable by law like the Conduct Rules.",
    topic: "Ethics",
    difficulty: "hard"
  },

  // ── SOCIETY ──
  {
    id: "soc-1",
    question: "The concept of 'Social Capital' was popularized by:",
    options: ["Max Weber", "Robert Putnam", "Karl Marx", "Emile Durkheim"],
    correctIndex: 1,
    explanation: "Robert Putnam popularized 'Social Capital' in his work 'Bowling Alone.' It refers to networks of relationships, trust, and norms that enable collective action in a society.",
    topic: "Society",
    difficulty: "medium"
  },
  {
    id: "soc-2",
    question: "Which constitutional amendment lowered the voting age from 21 to 18 years?",
    options: ["42nd Amendment", "44th Amendment", "61st Amendment", "73rd Amendment"],
    correctIndex: 2,
    explanation: "The 61st Constitutional Amendment Act (1988) lowered the voting age from 21 to 18 years, enabling greater youth participation in democracy.",
    topic: "Society",
    difficulty: "easy"
  },
  {
    id: "soc-3",
    question: "The 'Sachar Committee' was constituted to examine the socio-economic status of:",
    options: [
      "Scheduled Castes",
      "Muslim community in India",
      "Tribal communities",
      "Women in rural India"
    ],
    correctIndex: 1,
    explanation: "The Sachar Committee (2005), headed by Justice Rajinder Sachar, examined the social, economic, and educational conditions of the Muslim community in India and recommended several policy measures.",
    topic: "Society",
    difficulty: "medium"
  },
  {
    id: "soc-4",
    question: "Consider the following about India's demographic dividend:",
    statements: [
      "It refers to the economic growth potential from a large working-age population.",
      "India's demographic dividend is expected to last until approximately 2055-2060.",
      "All Indian states are at the same stage of demographic transition."
    ],
    options: ["1 and 2 only", "2 and 3 only", "1 only", "1, 2 and 3"],
    correctIndex: 0,
    explanation: "India's demographic dividend refers to the growth potential from its large working-age population (15-64). It is expected to last until 2055-2060. However, Indian states are at different stages — Southern states are aging faster than Northern ones.",
    topic: "Society",
    difficulty: "medium"
  },
  {
    id: "soc-5",
    question: "The Protection of Women from Domestic Violence Act was enacted in:",
    options: ["2001", "2005", "2010", "2013"],
    correctIndex: 1,
    explanation: "The Protection of Women from Domestic Violence Act, 2005, provides civil remedies to women facing domestic violence, including the right to residence and protection orders.",
    topic: "Society",
    difficulty: "easy"
  },
  {
    id: "soc-6",
    question: "Which of the following is NOT a feature of 'Sanskritization' as described by M.N. Srinivas?",
    options: [
      "Lower castes adopting practices of upper castes",
      "Change in social status within the caste hierarchy",
      "Complete abolition of the caste system",
      "Adoption of vegetarianism and teetotalism by lower castes"
    ],
    correctIndex: 2,
    explanation: "Sanskritization, described by M.N. Srinivas, refers to lower castes adopting customs of upper castes to improve status. It does NOT lead to abolition of the caste system — it works within the existing hierarchy.",
    topic: "Society",
    difficulty: "hard"
  },
  {
    id: "soc-7",
    question: "The Mandal Commission recommended reservation in government jobs for:",
    options: [
      "Scheduled Castes",
      "Scheduled Tribes",
      "Other Backward Classes (OBCs)",
      "Economically Weaker Sections"
    ],
    correctIndex: 2,
    explanation: "The Mandal Commission (1980), headed by B.P. Mandal, recommended 27% reservation for OBCs in central government jobs. It was implemented in 1990, sparking nationwide protests.",
    topic: "Society",
    difficulty: "easy"
  },
  {
    id: "soc-8",
    question: "The concept of 'Secularism' in the Indian Constitution means:",
    options: [
      "State has its own religion",
      "State is anti-religious",
      "State treats all religions equally (Sarva Dharma Sambhava)",
      "State prohibits religious practices"
    ],
    correctIndex: 2,
    explanation: "Indian secularism follows the 'Sarva Dharma Sambhava' principle — equal respect for all religions. The state does not promote any religion but can regulate religious practices for social reform.",
    topic: "Society",
    difficulty: "easy"
  },
  {
    id: "soc-9",
    question: "Consider the following about urbanization in India:",
    statements: [
      "Census 2011 showed that India's urban population exceeded 30%.",
      "Migration is the primary driver of urbanization in India.",
      "India follows the concept of 'census towns' to classify urban areas."
    ],
    options: ["1 and 3 only", "1 and 2 only", "2 and 3 only", "1, 2 and 3"],
    correctIndex: 0,
    explanation: "Census 2011 showed 31.2% urban population. India uses 'census towns' (areas meeting urban criteria but governed as villages). Natural population growth, not migration alone, is also a major driver.",
    topic: "Society",
    difficulty: "medium"
  },
  {
    id: "soc-10",
    question: "The 'Digital Divide' in India primarily refers to:",
    options: [
      "Difference between analog and digital TV viewers",
      "Gap in access to digital technology and internet across socio-economic groups",
      "Competition between Indian and foreign tech companies",
      "Difference between 4G and 5G coverage areas"
    ],
    correctIndex: 1,
    explanation: "The digital divide refers to the gap between those who have access to modern information technology (internet, computers) and those who don't — often along urban-rural, rich-poor, and gender lines.",
    topic: "Society",
    difficulty: "easy"
  },
];
