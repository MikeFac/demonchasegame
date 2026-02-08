function loadSelectedVerses() {
  let verses = [
  {
      Id: 1,
      Name: "Courage",
      Reference: "Psalms 118:6",
      Text: "Yahweh is on my side. I will not be afraid. What can man do to me?",
      question: "What does Psalm 118:6 say about the Lord?",
      options: [
          "The Lord is my refuge.",
          "The Lord is my strength.",
          "The Lord is on my side.",
          "The Lord is merciful."
      ],
      answer: "The Lord is on my side.",
      Lie: "Something terrible will happen to you."
  },
  
  {
      Id: 15,
      Name: "Courage",
      Reference: "1 Corinthians 16:13",
      Text: "Watch! Stand firm in the faith! Be courageous! Be strong!",
      question: "What does 1 Corinthians 16:13 exhort us to do?",
      options: [
          "Be alert, stand firm in the faith.",
          "Love your neighbor as yourself.",
          "Do unto others as you would have them do to you.",
          "Humble yourself before the Lord."
      ],
      answer: "Be alert, stand firm in the faith.",
      Lie: "God doesn't expect you to be courageous or strong."
  },
  
  {
      Id: 2,
      Name: "Courage",
      Reference: "Deuteronomy 31:6",
      Text: "Be strong and courageous. Don’t be afraid or scared of them, for Yahweh your God himself is who goes with you. He will not fail you nor forsake you.",
      question: "What does Deuteronomy 31:6 say about the Lord?",
      options: [
          "The Lord is my rock and my salvation.",
          "The Lord is gracious and compassionate.",
          "The Lord is slow to anger and abounding in love.",
          "The Lord will never leave nor forsake you."
      ],
      answer: "The Lord will never leave nor forsake you.",
      Lie: "Be scared. You can't rely on God this time."
  },
  
  
  {
      Id: 6,
      Name: "Courage",
      Reference: "Isaiah 41:13",
      Text: "For I, the LORD your God, will hold your right hand, saying to you, ‘Don’t be afraid. I will help you.’ ",
      question: "What does God say in Isaiah 41:13?",
      options: [
          "I will be with you",
          "I will protect you",
          "I will strengthen you",
          "All of these options"
      ],
      answer: "All of these options",
      Lie: "God is far away and will not help you."
  },
  
  
  {
      Id: 3,
      Name: "Courage",
      Reference: "Joshua 1:9",
      Text: "Haven’t I commanded you? Be strong and courageous. Don’t be afraid. Don’t be dismayed, for Yahweh your God is with you wherever you go.",
      question: "What does God command in Joshua 1:9?",
      options: [
          "Be strong and courageous",
          "Do not be afraid",
          "Do not be discouraged",
          "All of these options"
      ],
      answer: "All of these options",
      Lie: "You are weak. You will be defeated."
  },
  
  {
      Id: 4,
      Name: "Courage",
      Reference: "Isaiah 41:10",
      Text: "Don’t you be afraid, for I am with you. Don’t be dismayed, for I am your God. I will strengthen you. Yes, I will help you. Yes, I will uphold you with the right hand of my righteousness.",
      question: "What does God promise in Isaiah 41:10?",
      options: [
          "I will be with you",
          "I will uphold you",
          "I will strengthen you",
          "All of these options"
      ],
      answer: "All of these options",
      Lie: "This time the LORD will let you down. You are weak and abandoned! Give up hope."
  },
  
  {
      Id: 5,
      Name: "Courage",
      Reference: "2 Timothy 1:7",
      Text: "For God didn’t give us a spirit of fear, but of power, love, and self-control.",
      Lie: "You are powerless and you should be afraid and out of control right now.",
      question: "Which positive characteristic is NOT mentioned in 2 Timothy 1:7?",
      options: [
          "Power",
          "Love",
          "Self-control",
          "Joy"
      ],
      answer: "Joy"
  },
  
  {
      Id: 7,
      Name: "Courage",
      Reference: "Isaiah 26:3",
      Text: "You will keep whoever’s mind is steadfast in perfect peace, because he trusts in you.",
      Lie: "You just can't have peace in this situation.",
      question: "What does God promise in Isaiah 26:3?",
      options: [
          "Perfect peace",
          "Endless joy",
          "Abundant love",
          "Eternal life"
      ],
      answer: "Perfect peace"
  },
  
  {
      Id: 8,
      Name: "Courage",
      Reference: "Philippians 4:6",
      Text: "In nothing be anxious, but in everything, by prayer and petition with thanksgiving, let your requests be made known to God.",
      Lie: "Right now is a good time to be anxious. You are on your own.",
      question: "What should we do instead of being anxious according to Philippians 4:6?",
      options: [
          "Pray about everything",
          "Worry about nothing",
          "Give thanks in all things",
          "Ask for anything"
      ],
      answer: "Pray about everything"
  },
  
  {
      Id: 9,
      Name: "Courage",
      Reference: "Psalms 27:1",
      Text: "Yahweh is my light and my salvation. Whom shall I fear? Yahweh is the strength of my life. Of whom shall I be afraid?",
      Lie: "You are in the dark and you are in big trouble. You are too weak to handle this.",
      question: "What is the Lord according to Psalms 27:1?",
      options: [
          "My light and my salvation",
          "My stronghold",
          "My life's refuge",
          "My comforter"
      ],
      answer: "My light and my salvation"
  },
  
  {
      Id: 10,
      Name: "Courage",
      Reference: "Psalms 91:5",
      Text: "You shall not be afraid of the terror by night, nor of the arrow that flies by day",
      Lie: "Something will get you at night."
  },
  {
      Id: 11,
      Name: "Courage",
      Reference: "Matthew 10:28",
      Text: "Don’t be afraid of those who kill the body, but are not able to kill the soul. Rather, fear him who is able to destroy both soul and body in Gehenna.",
    Lie: "Be afraid of people. God will understand if you back down."
  }, 
  
  {
      Id: 12,
      Name: "Courage",
      Reference: "Isaiah 35:4",
      Text: "Tell those who have a fearful heart, “Be strong! Don’t be afraid! Behold, your God will come with vengeance, God’s retribution. He will come and save you.”",
    Lie: "God is going to abandon you to your enemies."
  }, 
  
  {
      Id: 13,
      Name: "Courage",
      Reference: "Psalms 18:2",
      Text: "Yahweh is my rock, my fortress, and my deliverer; my God, my rock, in whom I take refuge; my shield, and the horn of my salvation, my high tower.",
    Lie: "God won't protect you."
  }, 
  
  {
      Id: 14,
      Name: "Courage",
      Reference: "Psalms 23:4",
      Text: "Even though I walk through the valley of the shadow of death, I will fear no evil, for you are with me. Your rod and your staff, they comfort me.",
    Lie: "When things look really bad, you should be afraid."
  }, 
  {
      Id: 1,
      Name: "Faith",
      Reference: "Romans 10:17",
      Text: "So faith comes by hearing, and hearing by the word of God.",
    Lie: "You'll never have enough faith for what you need."
  }, 
  {
      Id: 2,
      Name: "Faith",
      Reference: "Hebrews 11:6",
      Text: "Without faith it is impossible to be well pleasing to him, for he who comes to God must believe that he exists, and that he is a rewarder of those who seek him.",
    Lie: "Being a good person is what counts. If there is a God, he will judge you on what you do not your faith."
  }, 
  {
      Id: 3,
      Name: "Faith",
      Reference: "Deuteronomy 31:6",
      Text: "Be strong and courageous. Don’t be afraid or scared of them, for Yahweh your God himself is He who goes with you. He will not fail you nor forsake you.”"
  },
  
  
  { Id: 4,
      Name: "Faith",
      Reference: "Mark 11:22",
      Text: "Jesus answered them, “Have faith in God.”",
    question: "What does Mark 11:22-23 say about faith?",
      options: [
    "Faith can move mountains.",
    "Faith without works is dead.",
    "By faith we are saved.",
    "Faith is the substance of things hoped for.",
  ],
  answer: "Faith can move mountains.",
    Lie: "God will let you down"
  }, {
      Id: 5,
      Name: "Faith",
      Reference: "Ephesians 2:8-9",
      Text: "for by grace you have been saved through faith, and that not of yourselves; it is the gift of God, not of works, that no one would boast.",
    Lie: "You have to work hard to be accepted by God"
  }, {
      Id: 6,
      Name: "Faith",
      Reference: "Matthew 21:22",
      Text: "All things, whatever you ask in prayer, believing, you will receive.”",
    question: "What does Matthew 21:22 say about prayer?",
  options: [
  "All prayers are answered immediately.",
  "Prayer must be done in a certain way.",
  "Believing prayer changes circumstances.",
  "Prayer is only for the righteous."
  ],
  answer: "Believing prayer changes circumstances.",
    Lie: "You can pray but it probably won't work"
  }, {
      Id: 7,
      Name: "Faith",
      Reference: "Proverbs 3:5-6",
      Text: "Trust in Yahweh with all your heart, and don’t lean on your own understanding. In all your ways acknowledge him, and he will make your paths straight.",
    question: "What does Proverbs 3:5-6 say about trust?",
  options: [
  "Trust in your own understanding.",
  "Trust in the wisdom of man.",
  "Trust in the Lord with all your heart.",
  "Trust in the riches of this world."
  ],
  answer: "Trust in the Lord with all your heart.",
    Lie: "Follow your own heart and go your own way."
  }, {
      Id: 8,
      Name: "Faith",
      Reference: "Hebrews 11:1",
      Text: "Now faith is assurance of things hoped for, proof of things not seen.",
    Lie: "Seeing is believing."
  }, {
      Id: 9,
      Name: "Faith",
      Reference: "2 Corinthians 5:7",
      Text: "for we walk by faith, not by sight.",
    Lie: "Make up your mind based on what you see with your eyes."
  }, {
      Id: 10,
      Name: "Faith",
      Reference: "Luke 1:37",
      Text: "For nothing spoken by God is impossible.",
    Lie: "God might have said it, but it won't happen."
  }, {
      Id: 11,
      Name: "Faith",
      Reference: "James 2:19",
      Text: "You believe that God is one. You do well. The demons also believe— and shudder."
  }, {
      Id: 12,
      Name: "Faith",
      Reference: "Ephesians 2:8",
      Text: "for by grace you have been saved through faith, and that not of yourselves; it is the gift of God,"
  }, {
      Id: 13,
      Name: "Faith",
      Reference: "John 3:16",
      Text: "For God so loved the world, that he gave his only born Son, that whoever believes in him should not perish, but have eternal life.",
    Lie: "God hates people. He doesn't love the people of the world."
  }, {
      Id: 14,
      Name: "Faith",
      Reference: "Philippians 4:13",
      Text: "I can do all things through Christ who strengthens me.",
    Lie: "What the LORD asks you to do is impossible."
  }, {
      Id: 15,
      Name: "Faith",
      Reference: "Mark 11:23",
      Text: "For most certainly I tell you, whoever may tell this mountain, ‘Be taken up and cast into the sea,’ and doesn’t doubt in his heart, but believes that what he says is happening, he shall have whatever he says.",
    Lie: "If you must pray, keep begging the LORD for the things you want changed."
  }, {
      Id: 16,
      Name: "Faith",
      Reference: "Mark 11:24",
      Text: "Therefore I tell you, all things whatever you pray and ask for, believe that you have received them, and you shall have them.",
    Lie: "Believe you have it only after you see it."
  }, {
      Id: 17,
      Name: "Faith",
      Reference: "Hebrews 13:8",
      Text: "Jesus Christ is the same yesterday, today, and forever.",
    Lie: "Jesus Christ doesn't heal any more, not like before anyway."
  }, {
      Id: 18,
      Name: "Faith",
      Reference: "Mark 9:23",
      Text: "Jesus said to him, “If you can believe, all things are possible to him who believes.” ",
    Lie: "Your situation is impossible and nothing can change it."
  }, {
      Id: 19,
      Name: "Faith",
      Reference: "James 2:24",
      Text: "You see then that by works a man is justified, and not only by faith.",
    Lie: "You can have real faith without any good works."
  }, {
      Id: 20,
      Name: "Faith",
      Reference: "Matthew 17:20",
      Text: "He said to them,“Because of your unbelief. For most certainly I tell you, if you have faith as a grain of mustard seed, you will tell this mountain, ‘Move from here to there,’ and it will move; and nothing will be impossible for you.",
    Lie: "You can't succeed with God."
  }, {
      Id: 21,
      Name: "Faith",
      Reference: "James 1:6",
      Text: "But let him ask in faith, without any doubting, for he who doubts is like a wave of the sea, driven by the wind and tossed."
  }, {
      Id: 22,
      Name: "Faith",
      Reference: "Galatians 2:20",
      Text: "I have been crucified with Christ, and it is no longer I who live, but Christ lives in me. That life which I now live in the flesh, I live by faith in the Son of God, who loved me and gave himself up for me."
  }, {
      Id: 23,
      Name: "Faith",
      Reference: "Luke 17:5",
      Text: "The apostles said to the Lord, “Increase our faith.”"
  }, {
      Id: 24,
      Name: "Faith",
      Reference: "James 2:24",
      Text: "You see then that by works a man is justified, and not only by faith."
  }, {
      Id: 25,
      Name: "Faith",
      Reference: "2 Timothy 4:7",
      Text: "I have fought the good fight. I have finished the course. I have kept the faith."
  }, {
      Id: 26,
      Name: "Faith",
      Reference: "1 Corinthians 16:13",
      Text: "Watch! Stand firm in the faith! Be courageous! Be strong!"
  }, {
      Id: 27,
      Name: "Faith",
      Reference: "1 John 5:4",
      Text: "For whatever is born of God overcomes the world. This is the victory that has overcome the world: your faith."
  }, {
      Id: 28,
      Name: "Faith",
      Reference: "Matthew 21:21-22",
      Text: "Jesus answered them,“Most certainly I tell you, if you have faith and don’t doubt, you will not only do what was done to the fig tree, but even if you told this mountain, ‘Be taken up and cast into the sea,’ it would be done. All things, whatever you ask in prayer, believing, you will receive.”"
  }, {
      Id: 29,
      Name: "Faith",
      Reference: "Hebrews 11:6",
      Text: "Without faith it is impossible to be well pleasing to him, for he who comes to God must believe that he exists, and that he is a rewarder of those who seek him."
  }, {
      Id: 30,
      Name: "Faith",
      Reference: "Mark 10:52",
      Text: "Jesus said to him,“Go your way. Your faith has made you well.” Immediately he received his sight and followed Jesus on the way."
  }, {
      Id: 31,
      Name: "Faith",
      Reference: "Romans 1:17",
      Text: "For in it is revealed God’s righteousness from faith to faith. As it is written, “But the righteous shall live by faith.”"
  }, {
      Id: 32,
      Name: "Faith",
      Reference: "Romans 15:13",
      Text: "Now may the God of hope fill you with all joy and peace in believing, that you may abound in hope in the power of the Holy Spirit."
  }, {
      Id: 33,
      Name: "Faith",
      Reference: "Psalms 46:10",
      Text: "“Be still, and know that I am God. I will be exalted among the nations. I will be exalted in the earth.”"
  }, {
      Id: 34,
      Name: "Faith",
      Reference: "Romans 12:3",
      Text: "For I say through the grace that was given me, to everyone who is among you, not to think of yourself more highly than you ought to think; but to think reasonably, as God has apportioned to each person a measure of faith."
  }, {
      Id: 35,
      Name: "Faith",
      Reference: "Matthew 21:21",
      Text: "Jesus answered them, “Most certainly I tell you, if you have faith and don’t doubt, you will not only do what was done to the fig tree, but even if you told this mountain, ‘Be taken up and cast into the sea,’ it would be done."
  }, {
      Id: 36,
      Name: "Faith",
      Reference: "Romans 10:9",
      Text: "that if you will confess with your mouth that Jesus is Lord and believe in your heart that God raised him from the dead, you will be saved."
  }, {
      Id: 37,
      Name: "Faith",
      Reference: "1 Corinthians 13:13",
      Text: "But now faith, hope, and love remain— these three. The greatest of these is love."
  }, {
      Id: 38,
      Name: "Faith",
      Reference: "Galatians 2:16",
      Text: "yet knowing that a man is not justified by the works of the law but through faith in Jesus Christ, even we believed in Christ Jesus, that we might be justified by faith in Christ and not by the works of the law, because no flesh will be justified by the works of the law."
  }, {
      Id: 39,
      Name: "Faith",
      Reference: "James 1:6",
      Text: "But let him ask in faith, without any doubting, for he who doubts is like a wave of the sea, driven by the wind and tossed."
  }, {
      Id: 40,
      Name: "Faith",
      Reference: "Ephesians 6:16",
      Text: "above all, taking up the shield of faith, with which you will be able to quench all the fiery darts of the evil one."
  }, {
      Id: 41,
      Name: "Faith",
      Reference: "Mark 11:24",
      Text: "Therefore I tell you, all things whatever you pray and ask for, believe that you have received them, and you shall have them."
  }, {
      Id: 42,
      Name: "Faith",
      Reference: "John 6:35",
      Text: "Jesus said to them,“I am the bread of life. Whoever comes to me will not be hungry, and whoever believes in me will never be thirsty."
  }, {
      Id: 43,
      Name: "Faith",
      Reference: "James 1:3",
      Text: "knowing that the testing of your faith produces endurance."
  }, {
      Id: 44,
      Name: "Faith",
      Reference: "John 8:24",
      Text: "I said therefore to you that you will die in your sins; for unless you believe that I am he, you will die in your sins.”"
  }, {
      Id: 45,
      Name: "Faith",
      Reference: "James 2:17",
      Text: "Even so faith, if it has no works, is dead in itself."
  }, {
      Id: 46,
      Name: "Faith",
      Reference: "Habakkuk 2:4",
      Text: "Behold, his soul is puffed up. It is not upright in him, but the righteous will live by his faith."
  }, {
      Id: 47,
      Name: "Faith",
      Reference: "Hebrews 11:7",
      Text: "By faith Noah, being warned about things not yet seen, moved with godly fear, prepared a ship for the saving of his house, through which he condemned the world and became heir of the righteousness which is according to faith."
  }, {
      Id: 48,
      Name: "Faith",
      Reference: "Mark 16:16",
      Text: "He who believes and is baptized will be saved"
  }, {
      Id: 49,
      Name: "Faith",
      Reference: "John 3:36",
      Text: "One who believes in the Son has eternal life, but one who disobeys the Son won’t see life, but the wrath of God remains on him.”"
  }, {
      Id: 50,
      Name: "Faith",
      Reference: "Hebrews 12:2",
      Text: "looking to Jesus, the author and perfecter of faith, who for the joy that was set before him endured the cross, despising its shame, and has sat down at the right hand of the throne of God."
  }, {
      Id: 51,
      Name: "Faith",
      Reference: "John 7:38",
      Text: "He who believes in me, as the Scripture has said, from within him will flow rivers of living water.”"
  }, {
      Id: 52,
      Name: "Faith",
      Reference: "1 Corinthians 13:2",
      Text: "If I have the gift of prophecy, and know all mysteries and all knowledge, and if I have all faith, so as to remove mountains, but don’t have love, I am nothing."
  }, {
      Id: 53,
      Name: "Faith",
      Reference: "1 Timothy 6:12",
      Text: "Fight the good fight of faith. Take hold of the eternal life to which you were called, and you confessed the good confession in the sight of many witnesses."
  }, {
      Id: 54,
      Name: "Faith",
      Reference: "Romans 14:1",
      Text: "Now accept one who is weak in faith, but not for disputes over opinions."
  }, {
      Id: 55,
      Name: "Faith",
      Reference: "John 11:25-26",
      Text: "Jesus said to her,“I am the resurrection and the life. He who believes in me will still live, even if he dies. Whoever lives and believes in me will never die. Do you believe this?”"
  }, {
      Id: 56,
      Name: "Faith",
      Reference: "Matthew 15:28",
      Text: "Then Jesus answered her, “Woman, great is your faith! Be it done to you even as you desire.” And her daughter was healed from that hour."
  }, {
      Id: 57,
      Name: "Faith",
      Reference: "Ephesians 3:16-17",
      Text: "that he would grant you, according to the riches of his glory, that you may be strengthened with power through his Spirit in the inner person, that Christ may dwell in your hearts through faith, to the end that you, being rooted and grounded in love,"
  }, {
      Id: 58,
      Name: "Faith",
      Reference: "Proverbs 3:5",
      Text: "Trust in Yahweh with all your heart, and don’t lean on your own understanding."
  
  }, {
      Id: 59,
      Name: "Faith",
      Reference: "Hebrews 11:11",
      Text: "By faith even Sarah herself received power to conceive, and she bore a child when she was past age, since she counted him faithful who had promised."
  }, {
      Id: 60,
      Name: "Faith",
      Reference: "Luke 18:27",
      Text: "But he said,“The things which are impossible with men are possible with God.”"
  }, {
      Id: 61,
      Name: "Faith",
      Reference: "John 1:12",
      Text: "But as many as received him, to them he gave the right to become God’s children, to those who believe in his name:"
  }, {
      Id: 62,
      Name: "Faith",
      Reference: "John 11:40",
      Text: "Jesus said to her,“Didn’t I tell you that if you believed, you would see God’s glory?”"
  }, {
      Id: 63,
      Name: "Faith",
      Reference: "1 Peter 1:8-9",
      Text: "whom, not having known, you love. In him, though now you don’t see him, yet believing, you rejoice greatly with joy that is unspeakable and full of glory, receiving the result of your faith, the salvation of your souls."
  }, {
      Id: 64,
      Name: "Faith",
      Reference: "1 Peter 1:7",
      Text: "that the proof of your faith, which is more precious than gold that perishes, even though it is tested by fire, may be found to result in praise, glory, and honor at the revelation of Jesus Christ—"
  }, {
      Id: 65,
      Name: "Faith",
      Reference: "1 Timothy 6:11",
      Text: "But you, man of God, flee these things, and follow after righteousness, godliness, faith, love, perseverance, and gentleness."
  }, {
      Id: 66,
      Name: "Faith",
      Reference: "Romans 4:20-21",
      Text: "Yet, looking to the promise of God, he didn’t waver through unbelief, but grew strong through faith, giving glory to God, and being fully assured that what he had promised, he was also able to perform."
  }, {
      Id: 67,
      Name: "Faith",
      Reference: "Mark 11:22",
      Text: "For I am not ashamed of the Good News of Christ, because it is the power of God for salvation for everyone who believes, for the Jew first, and also for the Greek."
  }, {
      Id: 68,
      Name: "Faith",
      Reference: "Romans 1:16-17",
      Text: "For I am not ashamed of the Good News of Christ, because it is the power of God for salvation for everyone who believes, for the Jew first, and also for the Greek. For in it is revealed God’s righteousness from faith to faith. As it is written, “But the righteous shall live by faith.”"
  }, {
      Id: 69,
      Name: "Faith",
      Reference: "Romans 10:10",
      Text: "For with the heart one believes resulting in righteousness"
  }, {
      Id: 70,
      Name: "Faith",
      Reference: "Psalms 23:1-2",
      Text: "Yahweh is my shepherd; I shall lack nothing. He makes me lie down in green pastures. He leads me beside still waters. He restores my soul."
  }, {
      Id: 71,
      Name: "Faith",
      Reference: "Galatians 5:22",
      Text: "But the fruit of the Spirit is love, joy, peace, patience, kindness, goodness, faith,"
  }, {
      Id: 72,
      Name: "Faith",
      Reference: "John 1:1",
      Text: "In the beginning was the Word, and the Word was with God, and the Word was God."
  }, {
      Id: 73,
      Name: "Faith",
      Reference: "1 Peter 3:15",
      Text: "But sanctify the Lord God in your hearts. Always be ready to give an answer to everyone who asks you a reason concerning the hope that is in you, with humility and fear,"
  }, {
      Id: 74,
      Name: "Faith",
      Reference: "1 Corinthians 10:13",
      Text: "No temptation has taken you except what is common to man. God is faithful, who will not allow you to be tempted above what you are able, but will with the temptation also make the way of escape, that you may be able to endure it."
  }, {
      Id: 75,
      Name: "Faith",
      Reference: "Joshua 1:9",
      Text: "Haven’t I commanded you? Be strong and courageous. Don’t be afraid. Don’t be dismayed, for Yahweh your God is with you wherever you go."
  }, {
      Id: 76,
      Name: "Faith",
      Reference: "2 Corinthians 5:6-7",
      Text: "Therefore we are always confident and know that while we are at home in the body, we are absent from the Lord; for we walk by faith, not by sight."
  }, {
      Id: 77,
      Name: "Faith",
      Reference: "Romans 5:1",
      Text: "Being therefore justified by faith, we have peace with God through our Lord Jesus Christ;"
  }, {
      Id: 78,
      Name: "Faith",
      Reference: "Jeremiah 29:11",
      Text: "For I know the thoughts that I think toward you,” says Yahweh, “thoughts of peace, and not of evil, to give you hope and a future."
  }, {
      Id: 79,
      Name: "Faith",
      Reference: "1 John 5:1",
      Text: "Whoever believes that Jesus is the Christ has been born of God. Whoever loves the Father also loves the child who is born of him."
  }, {
      Id: 80,
      Name: "Faith",
      Reference: "Matthew 6:24",
      Text: "“No one can serve two masters, for either he will hate the one and love the other, or else he will be devoted to one and despise the other. You can’t serve both God and Mammon."
  }, {
      Id: 81,
      Name: "Faith",
      Reference: "Hebrews 10:38",
      Text: "But the righteous one will live by faith. If he shrinks back, my soul has no pleasure in him.”"
  }, {
      Id: 82,
      Name: "Faith",
      Reference: "1 Thessalonians 1:3",
      Text: "remembering without ceasing your work of faith and labor of love and perseverance of hope in our Lord Jesus Christ, before our God and Father."
  }, {
      Id: 83,
      Name: "Faith",
      Reference: "Mark 9:24",
      Text: "Immediately the father of the child cried out with tears, “I believe. Help my unbelief!”"
  }, {
      Id: 84,
      Name: "Faith",
      Reference: "Matthew 9:22",
      Text: "But Jesus, turning around and seeing her, said, “Daughter, cheer up! Your faith has made you well.” And the woman was made well from that hour."
  }, {
      Id: 85,
      Name: "Faith",
      Reference: "Proverbs 3:6",
      Text: "In all your ways acknowledge him, and he will make your paths straight."
  }, {
      Id: 86,
      Name: "Faith",
      Reference: "Luke 17:6",
      Text: "The Lord said, “If you had faith like a grain of mustard seed, you would tell this sycamore tree, ‘Be uprooted and be planted in the sea,’ and it would obey you."
  }, {
      Id: 87,
      Name: "Faith",
      Reference: "Galatians 5:6",
      Text: "For in Christ Jesus neither circumcision nor uncircumcision amounts to anything, but faith working through love."
  }, {
      Id: 88,
      Name: "Faith",
      Reference: "Romans 14:23",
      Text: "But he who doubts is condemned if he eats, because it isn’t of faith; and whatever is not of faith is sin."
  }, {
      Id: 89,
      Name: "Faith",
      Reference: "Philippians 4:19",
      Text: "My God will supply every need of yours according to his riches in glory in Christ Jesus."
  }, {
      Id: 90,
      Name: "Faith",
      Reference: "1 Peter 5:7",
      Text: "casting all your worries on him, because he cares for you."
  }, {
      Id: 91,
      Name: "Faith",
      Reference: "Luke 7:50",
      Text: "He said to the woman,“Your faith has saved you. Go in peace.”"
  }, {
      Id: 92,
      Name: "Faith",
      Reference: "James 2:18",
      Text: "Yes, a man will say, “You have faith, and I have works.” Show me your faith without works, and I will show you my faith by my works."
  }, {
      Id: 93,
      Name: "Faith",
      Reference: "1 Timothy 4:12",
      Text: "Let no man despise your youth; but be an example to those who believe, in word, in your way of life, in love, in spirit, in faith, and in purity."
  }, {
      Id: 94,
      Name: "Faith",
      Reference: "Romans 8:28",
      Text: "We know that all things work together for good for those who love God, for those who are called according to his purpose."
  }, {
      Id: 95,
      Name: "Faith",
      Reference: "1 John 5:13",
      Text: "These things I have written to you who believe in the name of the Son of God, that you may know that you have eternal life, and that you may continue to believe in the name of the Son of God."
  }, {
      Id: 96,
      Name: "Faith",
      Reference: "1 John 5:5",
      Text: "Who is he who overcomes the world, but he who believes that Jesus is the Son of God?"
  }, {
      Id: 97,
      Name: "Faith",
      Reference: "Isaiah 40:31",
      Text: "but those who wait for Yahweh will renew their strength. They will mount up with wings like eagles. They will run, and not be weary. They will walk, and not faint."
  }, {
      Id: 98,
      Name: "Faith",
      Reference: "Hebrews 11:2",
      Text: "For by this, the elders obtained approval."
  }, {
      Id: 99,
      Name: "Faith",
      Reference: "Psalms 119:30",
      Text: "I have chosen the way of truth. I have set your ordinances before me."
  }, {
      Id: 100,
      Name: "Faith",
      Reference: "John 3:16-17",
      Text: "For God so loved the world, that he gave his only born Son, that whoever believes in him should not perish, but have eternal life. For God didn’t send his Son into the world to judge the world, but that the world should be saved through him."
  },{
      Id: 101,
      Name: "Faith",
      Reference: "1 Corinthians 2:5",
      Text: "that your faith wouldn’t stand in the wisdom of men, but in the power of God."
  },   {
      Id: 102,
      Name: "Wisdom",
      Reference: "James 1:5",
      Text: "But if any of you lacks wisdom, let him ask of God, who gives to all liberally and without reproach, and it will be given to him.",
    Lie: "God cannot be trusted to guide you."
  }, {
      Id: 103,
      Name: "Wisdom",
      Reference: "James 3:17",
      Text: "But the wisdom that is from above is first pure, then peaceful, gentle, reasonable, full of mercy and good fruits, without partiality, and without hypocrisy.",
    Lie: "Real wisdom is being street smart, cunning and outsmarting others."
  }, {
      Id: 104,
      Name: "Wisdom",
      Reference: "Proverbs 3:13-14",
      Text: "Happy is the man who finds wisdom, the man who gets understanding. For her good profit is better than getting silver, and her return is better than fine gold.",
    Lie: "Wisdom God's way will make life boring."
  }, {
      Id: 105,
      Name: "Wisdom",
      Reference: "Proverbs 1:7",
      Text: "The fear of Yahweh is the beginning of knowledge, but the foolish despise wisdom and instruction.",
    Lie: "If someone points out your mistakes, they should shut up."
  }, {
      Id: 106,
      Name: "Wisdom",
      Reference: "Proverbs 19:20",
      Text: "Listen to counsel and receive instruction, that you may be wise in your latter end.",
    Lie: "Go your own way. No one can tell you how to live your life."
  }, {
      Id: 107,
      Name: "Wisdom",
      Reference: "Ephesians 5:15-17",
      Text: "Therefore watch carefully how you walk, not as unwise, but as wise, redeeming the time, because the days are evil. Therefore, don’t be foolish, but understand what the will of the Lord is.",
    Lie: "Do what you want, when you want, how you want."
  }, {
      Id: 108,
      Name: "Wisdom",
      Reference: "Proverbs 12:15",
      Text: "The way of a fool is right in his own eyes, but he who is wise listens to counsel.",
    question: "What does Proverbs 12:15 say about wisdom?",
      options: [
  "Wisdom comes from learning.",
  "Wisdom is knowing what is right.",
  "Wisdom is a gift from God.",
  "Wisdom listens to advice."
  ],
      answer: "Wisdom listens to advice.",
    Lie: "You've got the truth within. Follow your own heart."
  }, {
      Id: 109,
      Name: "Wisdom",
      Reference: "Proverbs 10:23",
      Text: "It is a fool’s pleasure to do wickedness, but wisdom is a man of understanding’s pleasure.",
    Lie: "Wisdom is boring. It is more fun to sin."
  }, {
      Id: 110,
      Name: "Wisdom",
      Reference: "Colossians 3:16",
      Text: "Let the word of Christ dwell in you richly; in all wisdom teaching and admonishing one another with psalms, hymns, and spiritual songs, singing with grace in your heart to the Lord.",
    Lie: "Don't waste your time with the Bible."
  }, {
      Id: 111,
      Name: "Wisdom",
      Reference: "Proverbs 18:15",
      Text: "The heart of the discerning gets knowledge. The ear of the wise seeks knowledge.",
    Lie: "You are smart and you already know enough."
  }, {
      Id: 112,
      Name: "Wisdom",
      Reference: "Proverbs 2:6",
      Text: "For Yahweh gives wisdom. Out of his mouth comes knowledge and understanding.",
    Lie: "You can be wise without listening to the LORD."
  }, {
      Id: 113,
      Name: "Wisdom",
      Reference: "Psalms 111:10",
      Text: "The fear of Yahweh is the beginning of wisdom. All those who do his work have a good understanding. His praise endures forever!",
    Lie: "God's commands are not for your good and following them is stupid."
  }, {
      Id: 114,
      Name: "Wisdom",
      Reference: "Proverbs 17:27-28",
      Text: "He who spares his words has knowledge. He who is even tempered is a man of understanding. Even a fool, when he keeps silent, is counted wise. When he shuts his lips, he is thought to be discerning.",
    Lie: "Talk whatever comes to mind and something good will come out."
  }, {
      Id: 115,
      Name: "Wisdom",
      Reference: "Proverbs 16:16",
      Text: "How much better it is to get wisdom than gold! Yes, to get understanding is to be chosen rather than silver.",
    Lie: "At the end of the day, only money is what counts."
  }, {
      Id: 116,
      Name: "Wisdom",
      Reference: "Luke 21:15",
      Text: "for I will give you a mouth and wisdom which all your adversaries will not be able to withstand or to contradict."
  }, {
      Id: 117,
      Name: "Wisdom",
      Reference: "Proverbs 3:7",
      Text: "Don’t be wise in your own eyes. Fear Yahweh, and depart from evil."
  }, {
      Id: 118,
      Name: "Wisdom",
      Reference: "Proverbs 9:10",
      Text: "The fear of Yahweh is the beginning of wisdom. The knowledge of the Holy One is understanding."
  }, {
      Id: 119,
      Name: "Wisdom",
      Reference: "Proverbs 11:2",
      Text: "When pride comes, then comes shame, but with humility comes wisdom."
  }, {
      Id: 120,
      Name: "Wisdom",
      Reference: "1 Corinthians 1:30",
      Text: "Because of him, you are in Christ Jesus, who was made to us wisdom from God, and righteousness and sanctification, and redemption,"
  }, {
      Id: 121,
      Name: "Wisdom",
      Reference: "Psalms 90:12",
      Text: "So teach us to count our days, that we may gain a heart of wisdom."
  }, {
      Id: 122,
      Name: "Wisdom",
      Reference: "Ecclesiastes 8:1",
      Text: "Who is like the wise man? And who knows the interpretation of a thing? A man’s wisdom makes his face shine, and the hardness of his face is changed."
  }, {
      Id: 123,
      Name: "Wisdom",
      Reference: "Proverbs 4:6-7",
      Text: "Don’t forsake her, and she will preserve you. Love her, and she will keep you. Wisdom is supreme. Get wisdom.Yes, though it costs all your possessions, get understanding."
  }, {
      Id: 124,
      Name: "Wisdom",
      Reference: "James 3:13",
      Text: "Who is wise and understanding among you? Let him show by his good conduct that his deeds are done in gentleness of wisdom."
  }, {
      Id: 125,
      Name: "Wisdom",
      Reference: "Ecclesiastes 7:12",
      Text: "For wisdom is a defense, even as money is a defense; but the excellency of knowledge is that wisdom preserves the life of him who has it."
  }, {
      Id: 126,
      Name: "Wisdom",
      Reference: "Proverbs 15:33",
      Text: "The fear of Yahweh teaches wisdom. Before honor is humility."
  }, {
      Id: 127,
      Name: "Wisdom",
      Reference: "Job 12:12",
      Text: "With aged men is wisdom, in length of days understanding."
  }, {
      Id: 128,
      Name: "Wisdom",
      Reference: "Proverbs 14:8",
      Text: "The wisdom of the prudent is to think about his way, but the folly of fools is deceit."
  }, {
      Id: 129,
      Name: "Wisdom",
      Reference: "Colossians 2:8",
      Text: "Be careful that you don’t let anyone rob you through his philosophy and vain deceit, after the tradition of men, after the elemental spirits of the world, and not after Christ."
  }, {
      Id: 130,
      Name: "Wisdom",
      Reference: "Ephesians 1:17",
      Text: "that the God of our Lord Jesus Christ, the Father of glory, may give to you a spirit of wisdom and revelation in the knowledge of him"
  }, {
      Id: 131,
      Name: "Wisdom",
      Reference: "Matthew 7:24",
      Text: "“Everyone therefore who hears these words of mine and does them, I will liken him to a wise man who built his house on a rock."
  }, {
      Id: 132,
      Name: "Wisdom",
      Reference: "Job 12:12-13",
      Text: "With aged men is wisdom, in length of days understanding. “With God is wisdom and might. He has counsel and understanding."
  }, {
      Id: 133,
      Name: "Wisdom",
      Reference: "Proverbs 24:3-6",
      Text: "Through wisdom a house is built; by understanding it is established; by knowledge the rooms are filled with all rare and beautiful treasure. A wise man has great power. A knowledgeable man increases strength, for by wise guidance you wage your war, and victory is in many advisors."
  }, {
      Id: 134,
      Name: "Wisdom",
      Reference: "Proverbs 19:8",
      Text: "He who gets wisdom loves his own soul. He who keeps understanding shall find good."
  }, {
      Id: 135,
      Name: "Wisdom",
      Reference: "Proverbs 29:11",
      Text: "A fool vents all of his anger, but a wise man brings himself under control."
  }, {
      Id: 136,
      Name: "Wisdom",
      Reference: "Romans 11:33",
      Text: "Oh the depth of the riches both of the wisdom and the knowledge of God! How unsearchable are his judgments, and his ways past tracing out!"
  }, {
      Id: 137,
      Name: "Wisdom",
      Reference: "Proverbs 10:8",
      Text: "The wise in heart accept commandments, but a chattering fool will fall."
  }, {
      Id: 138,
      Name: "Wisdom",
      Reference: "1 Corinthians 1:25",
      Text: "because the foolishness of God is wiser than men, and the weakness of God is stronger than men."
  }, {
      Id: 139,
      Name: "Wisdom",
      Reference: "1 Corinthians 3:18",
      Text: "Let no one deceive himself. If anyone thinks that he is wise among you in this world, let him become a fool that he may become wise."
  }, {
      Id: 140,
      Name: "Wisdom",
      Reference: "Proverbs 3:5",
      Text: "Trust in Yahweh with all your heart, and don’t lean on your own understanding."
  }, {
      Id: 141,
      Name: "Wisdom",
      Reference: "Proverbs 14:16",
      Text: "A wise man fears and shuns evil, but the fool is hot headed and reckless."
  }, {
      Id: 142,
      Name: "Wisdom",
      Reference: "Proverbs 13:10",
      Text: "Pride only breeds quarrels, but wisdom is with people who take advice."
  }, {
      Id: 143,
      Name: "Wisdom",
      Reference: "Ephesians 5:15-16",
      Text: "Therefore watch carefully how you walk, not as unwise, but as wise, redeeming the time, because the days are evil."
  }, {
      Id: 144,
      Name: "Wisdom",
      Reference: "Job 28:28",
      Text: "To man he said, ‘Behold, the fear of the Lord, that is wisdom. To depart from evil is understanding.’”"
  }, {
      Id: 145,
      Name: "Wisdom",
      Reference: "Ecclesiastes 2:26",
      Text: "For to the man who pleases him, God gives wisdom, knowledge, and joy; but to the sinner he gives travail, to gather and to heap up, that he may give to him who pleases God. This also is vanity and a chasing after wind."
  }, {
      Id: 146,
      Name: "Wisdom",
      Reference: "Proverbs 14:33",
      Text: "Wisdom rests in the heart of one who has understanding, and is even made known in the inward part of fools."
  }, {
      Id: 147,
      Name: "Wisdom",
      Reference: "John 8:32",
      Text: "You will know the truth, and the truth will make you free.”"
  }, {
      Id: 148,
      Name: "Wisdom",
      Reference: "Proverbs 13:1",
      Text: "A wise son listens to his father’s instruction, but a scoffer doesn’t listen to rebuke."
  }, {
      Id: 149,
      Name: "Wisdom",
      Reference: "Colossians 2:3",
      Text: "in whom all the treasures of wisdom and knowledge are hidden."
  }, {
      Id: 150,
      Name: "Wisdom",
      Reference: "Isaiah 40:28",
      Text: "Haven’t you known? Haven’t you heard? The everlasting God, Yahweh, the Creator of the ends of the earth, doesn’t faint. He isn’t weary. His understanding is unsearchable."
  }, {
      Id: 151,
      Name: "Wisdom",
      Reference: "Psalms 37:30",
      Text: "The mouth of the righteous talks of wisdom. His tongue speaks justice."
  }, {
      Id: 152,
      Name: "Wisdom",
      Reference: "Proverbs 29:15",
      Text: "The rod of correction gives wisdom,but a child left to himself causes shame to his mother."
  }, {
      Id: 153,
      Name: "Wisdom",
      Reference: "Proverbs 4:7",
      Text: "Wisdom is supreme. Get wisdom.Yes, though it costs all your possessions, get understanding."
  }, {
      Id: 154,
      Name: "Wisdom",
      Reference: "Colossians 2:2-3",
      Text: "that their hearts may be comforted, they being knit together in love, and gaining all riches of the full assurance of understanding, that they may know the mystery of God, both of the Father and of Christ, in whom all the treasures of wisdom and knowledge are hidden."
  }, {
      Id: 155,
      Name: "Wisdom",
      Reference: "Romans 12:2",
      Text: "Don’t be conformed to this world, but be transformed by the renewing of your mind, so that you may prove what is the good, well-pleasing, and perfect will of God."
  }, {
      Id: 156,
      Name: "Wisdom",
      Reference: "Proverbs 11:30",
      Text: "The fruit of the righteous is a tree of life. He who is wise wins souls."
  }, {
      Id: 157,
      Name: "Wisdom",
      Reference: "Psalms 107:43",
      Text: "Whoever is wise will pay attention to these things. They will consider the loving kindnesses of Yahweh."
  }, {
      Id: 158,
      Name: "Wisdom",
      Reference: "Proverbs 13:20",
      Text: "One who walks with wise men grows wise, but a companion of fools suffers harm."
  }, {
      Id: 159,
      Name: "Wisdom",
      Reference: "Daniel 2:23",
      Text: "I thank you and praise you,O God of my fathers, who have given me wisdom and might, and have now made known to me what we desired of you; for you have made known to us the king’s matter.”"
  }, {
      Id: 160,
      Name: "Wisdom",
      Reference: "2 Timothy 2:7",
      Text: "Consider what I say, and may the Lord give you understanding in all things."
  }, {
      Id: 161,
      Name: "Wisdom",
      Reference: "2 Corinthians 1:12",
      Text: "For our boasting is this: the testimony of our conscience that in holiness and sincerity of God, not in fleshly wisdom but in the grace of God, we behaved ourselves in the world, and more abundantly toward you."
  }, {
      Id: 162,
      Name: "Wisdom",
      Reference: "Proverbs 3:13",
      Text: "Happy is the man who finds wisdom, the man who gets understanding."
  }, {
      Id: 163,
      Name: "Wisdom",
      Reference: "Job 12:13",
      Text: "“With God is wisdom and might. He has counsel and understanding."
  }, {
      Id: 164,
      Name: "Wisdom",
      Reference: "Proverbs 28:26",
      Text: "One who trusts in himself is a fool"
  }, {
      Id: 165,
      Name: "Wisdom",
      Reference: "Proverbs 17:10",
      Text: "A rebuke enters deeper into one who has understandingthan a hundred lashes into a fool."
  }, {
      Id: 166,
      Name: "Wisdom",
      Reference: "Jeremiah 9:24",
      Text: "But let him who glories glory in this, that he has understanding, and knows me, that I am Yahweh who exercises loving kindness, justice, and righteousness in the earth, for I delight in these things,” says Yahweh."
  }, {
      Id: 167,
      Name: "Wisdom",
      Reference: "James 1:5-6",
      Text: "But if any of you lacks wisdom, let him ask of God, who gives to all liberally and without reproach, and it will be given to him. But let him ask in faith, without any doubting, for he who doubts is like a wave of the sea, driven by the wind and tossed."
  }, {
      Id: 168,
      Name: "Wisdom",
      Reference: "Colossians 1:9",
      Text: "For this cause, we also, since the day we heard this, don’t cease praying and making requests for you, that you may be filled with the knowledge of his will in all spiritual wisdom and understanding,"
  }, {
      Id: 169,
      Name: "Wisdom",
      Reference: "Proverbs 4:5",
      Text: "Get wisdom. Get understanding. Don’t forget, and don’t deviate from the words of my mouth."
  }, {
      Id: 170,
      Name: "Wisdom",
      Reference: "Proverbs 23:12",
      Text: "Apply your heart to instruction, and your ears to the words of knowledge."
  }, {
      Id: 171,
      Name: "Wisdom",
      Reference: "Colossians 4:5-6",
      Text: "Walk in wisdom toward those who are outside, redeeming the time. Let your speech always be with grace, seasoned with salt, that you may know how you ought to answer each one."
  }, {
      Id: 172,
      Name: "Wisdom",
      Reference: "Proverbs 16:23",
      Text: "The heart of the wise instructs his mouth, and adds learning to his lips."
  }, {
      Id: 173,
      Name: "Wisdom",
      Reference: "Proverbs 15:12",
      Text: "A scoffer doesn’t love to be reproved"
  }, {
      Id: 174,
      Name: "Wisdom",
      Reference: "2 Timothy 1:7",
      Text: "For God didn’t give us a spirit of fear, but of power, love, and self-control."
  }, {
      Id: 175,
      Name: "Wisdom",
      Reference: "Jeremiah 33:3",
      Text: "Call to me, and I will answer you, and will show you great and difficult things, which you don’t know."
  }, {
      Id: 176,
      Name: "Wisdom",
      Reference: "1 Corinthians 3:19",
      Text: "For the wisdom of this world is foolishness with God. For it is written, “He has taken the wise in their craftiness.”"
  }, {
      Id: 177,
      Name: "Wisdom",
      Reference: "Proverbs 24:14",
      Text: "so you shall know wisdom to be to your soul. If you have found it, then there will be a reward: Your hope will not be cut off."
  }, {
      Id: 178,
      Name: "Wisdom",
      Reference: "Psalms 51:6",
      Text: "Behold, you desire truth in the inward parts. You teach me wisdom in the inmost place."
  }, {
      Id: 179,
      Name: "Wisdom",
      Reference: "Revelation 5:12",
      Text: "saying with a loud voice, “Worthy is the Lamb who has been killed to receive the power, wealth, wisdom, strength, honor, glory, and blessing!”"
  }, {
      Id: 180,
      Name: "Wisdom",
      Reference: "Isaiah 28:29",
      Text: "This also comes out from Yahweh of Armies, who is wonderful in counsel, and excellent in wisdom."
  }, {
      Id: 181,
      Name: "Wisdom",
      Reference: "Jeremiah 9:23",
      Text: "Yahweh says,“Don’t let the wise man glory in his wisdom.Don’t let the mighty man glory in his might.Don’t let the rich man glory in his riches."
  }, {
      Id: 182,
      Name: "Wisdom",
      Reference: "Proverbs 14:29",
      Text: "He who is slow to anger has great understanding, but he who has a quick temper displays folly."
  }, {
      Id: 183,
      Name: "Wisdom",
      Reference: "Daniel 2:20",
      Text: "Daniel answered,“Blessed be the name of God forever and ever; for wisdom and might are his."
  }, {
      Id: 184,
      Name: "Wisdom",
      Reference: "Philippians 1:9",
      Text: "This I pray, that your love may abound yet more and more in knowledge and all discernment,"
  }, {
      Id: 185,
      Name: "Wisdom",
      Reference: "Proverbs 21:20",
      Text: "There is precious treasure and oil in the dwelling of the wise, but a foolish man swallows it up."
  }, {
      Id: 186,
      Name: "Wisdom",
      Reference: "1 Corinthians 1:24",
      Text: "but to those who are called, both Jews and Greeks, Christ is the power of God and the wisdom of God;"
  }, {
      Id: 187,
      Name: "Wisdom",
      Reference: "Ecclesiastes 10:12",
      Text: "The words of a wise man’s mouth are gracious"
  }, {
      Id: 188,
      Name: "Wisdom",
      Reference: "Isaiah 5:21",
      Text: "Woe to those who are wise in their own eyes, and prudent in their own sight!"
  }, {
      Id: 189,
      Name: "Wisdom",
      Reference: "Daniel 1:17",
      Text: "Now as for these four youths, God gave them knowledge and skill in all learning and wisdom; and Daniel had understanding in all visions and dreams."
  }, {
      Id: 190,
      Name: "Wisdom",
      Reference: "Proverbs 4:5",
      Text: "Get wisdom. Get understanding. Don’t forget, and don’t deviate from the words of my mouth. Don’t forsake her, and she will preserve you. Love her, and she will keep you."
  }, {
      Id: 191,
      Name: "Wisdom",
      Reference: "John 8:12",
      Text: "Again, therefore, Jesus spoke to them, saying,“I am the light of the world. He who follows me will not walk in the darkness, but will have the light of life.”"
  }, {
      Id: 192,
      Name: "Wisdom",
      Reference: "1 Corinthians 2:16",
      Text: "“For who has known the mind of the Lord that he should instruct him?” But we have Christ’s mind."
  }, {
      Id: 193,
      Name: "Wisdom",
      Reference: "2 Timothy 3:16-17",
      Text: "Every Scripture is God-breathed and profitable for teaching, for reproof, for correction, and for instruction in righteousness, that each person who belongs to God may be complete, thoroughly equipped for every good work."
  }, {
      Id: 194,
      Name: "Wisdom",
      Reference: "Daniel 12:3",
      Text: "Those who are wise will shine as the brightness of the expanse. Those who turn many to righteousness will shine as the stars forever and ever."
  }, {
      Id: 195,
      Name: "Wisdom",
      Reference: "Proverbs 18:1",
      Text: "A man who isolates himself pursues selfishness, and defies all sound judgment."
  }, {
      Id: 196,
      Name: "Wisdom",
      Reference: "Ephesians 3:16",
      Text: "that he would grant you, according to the riches of his glory, that you may be strengthened with power through his Spirit in the inner person"
  }, {
      Id: 197,
      Name: "Wisdom",
      Reference: "Galatians 4:9",
      Text: "But now that you have come to know God, or rather to be known by God, why do you turn back again to the weak and miserable elemental principles, to which you desire to be in bondage all over again?"
  }, {
      Id: 198,
      Name: "Wisdom",
      Reference: "Proverbs 29:3",
      Text: "Whoever loves wisdom brings joy to his father"
  }, {
      Id: 199,
      Name: "Knowledge",
      Reference: "2 Timothy 2:15",
      Text: "Give diligence to present yourself approved by God, a workman who doesn’t need to be ashamed, properly handling the Word of Truth.",
    Lie: "Studying the Bible makes you a religious nut. Take it easy."
  }, {
      Id: 200,
      Name: "Knowledge",
      Reference: "Proverbs 18:15",
      Text: "The heart of the discerning gets knowledge. The ear of the wise seeks knowledge.",
    Lie: "You don't need to get experience and knowledge. You already know enough."
  }, {
      Id: 201,
      Name: "Knowledge",
      Reference: "Proverbs 1:7",
      Text: "The fear of the LORD is the beginning of knowledge, but the foolish despise wisdom and instruction.",
    Lie: "People who try to teach you something about God are annoying and should go away."
  }, {
      Id: 202,
      Name: "Knowledge",
      Reference: "Proverbs 2:10",
      Text: "For wisdom will enter into your heart. Knowledge will be pleasant to your soul.",
    Lie: "Knowing God will be painful."
  }, {
      Id: 203,
      Name: "Knowledge",
      Reference: "Hosea 4:6",
      Text: "My people are destroyed for lack of knowledge. Because you have rejected knowledge, I will also reject you, that you may be no priest to me. Because you have forgotten your God’s law, I will also forget your children.",
    Lie: "What you don't know can't hurt you."
  }, {
      Id: 204,
      Name: "Knowledge",
      Reference: "Proverbs 24:5",
      Text: "A wise man has great power. A knowledgeable man increases strength,",
    Lie: "Godly wisdom makes you weak."
  }, {
      Id: 205,
      Name: "Knowledge",
      Reference: "Proverbs 15:14",
      Text: "The heart of one who has understanding seeks knowledge, but the mouths of fools feed on folly.",
    Lie: "You already know enough. Tell everyone what you know."
  }, {
      Id: 206,
      Name: "Knowledge",
      Reference: "Proverbs 8:10",
      Text: "Receive my instruction rather than silver, knowledge rather than choice gold.",
    Lie: "Money is more important than doing what God says."
  }, {
      Id: 207,
      Name: "Knowledge",
      Reference: "Proverbs 3:1-35",
      Text: "My son, don’t forget my teaching, but let your heart keep my commandments,",
    Lie: "Once you've learned the Bible, you can safely forget it."
  }, {
      Id: 208,
      Name: "Knowledge",
      Reference: "Proverbs 12:1",
      Text: "Whoever loves correction loves knowledge,but he who hates reproof is stupid.",
    Lie: "People who correct you can stick it in their ear."
  }, {
      Id: 209,
      Name: "Knowledge",
      Reference: "Psalms 119:66",
      Text: "Teach me good judgment and knowledge, for I believe in your commandments.",
    Lie: "God's commandments are out of date."
  }, {
      Id: 210,
      Name: "Knowledge",
      Reference: "Proverbs 2:6",
      Text: "For Yahweh gives wisdom. Out of his mouth comes knowledge and understanding.",
    Lie: "The LORD won't even tell you what you need to know."
  }, {
      Id: 211,
      Name: "Knowledge",
      Reference: "Hosea 4:6",
      Text: "My people are destroyed for lack of knowledge. Because you have rejected knowledge, I will also reject you, that you may be no priest to me.",
    Lie: "Don't bother yourself with the knowledge of God and his ways. It isn't that important right now."
  }, {
      Id: 212,
      Name: "Knowledge",
      Reference: "Proverbs 1:5",
      Text: "that the wise man may hear, and increase in learning; that the man of understanding may attain to sound counsel;",
    Lie: "You are wise enough and don't need to learn any more really."
  },  {
      Id: 214,
      Name: "Knowledge",
      Reference: "James 1:5",
      Text: "But if any of you lacks wisdom, let him ask of God, who gives to all liberally and without reproach, and it will be given to him."
  }, {
      Id: 215,
      Name: "Knowledge",
      Reference: "1 Corinthians 12:8",
      Text: "For to one is given through the Spirit the word of wisdom, and to another the word of knowledge according to the same Spirit,",
    Lie: "Supernatural knowledge is not available to you."
  }, {
      Id: 216,
      Name: "Knowledge",
      Reference: "Proverbs 9:10",
      Text: "The fear of Yahweh is the beginning of wisdom. The knowledge of the Holy One is understanding.",
    Lie: "You cannot really know God. He is too holy and distant."
  }, {
      Id: 217,
      Name: "Knowledge",
      Reference: "Ecclesiastes 7:12",
      Text: "For wisdom is a defense, even as money is a defense; but the excellency of knowledge is that wisdom preserves the life of him who has it.",
    Lie: "You will be safe enough even if you ignore the facts and do not do what is right."
  }, {
      Id: 218,
      Name: "Knowledge",
      Reference: "Hosea 6:6",
      Text: "For I desire mercy, and not sacrifice; and the knowledge of God more than burnt offerings.",
    Lie: "All God wants is more and more sacrifice."
  }, {
      Id: 219,
      Name: "Knowledge",
      Reference: "Proverbs 1:22",
      Text: "“How long, you simple ones, will you love simplicity? How long will mockers delight themselves in mockery, and fools hate knowledge?"
  }, {
      Id: 220,
      Name: "Knowledge",
      Reference: "Proverbs 2:10-11",
      Text: "For wisdom will enter into your heart. Knowledge will be pleasant to your soul. Discretion will watch over you. Understanding will keep you,"
  }, {
      Id: 221,
      Name: "Knowledge",
      Reference: "Proverbs 1:29",
      Text: "because they hated knowledge, and didn’t choose the fear of Yahweh."
  }, {
      Id: 222,
      Name: "Knowledge",
      Reference: "Psalms 111:10",
      Text: "The fear of Yahweh is the beginning of wisdom. All those who do his work have a good understanding. His praise endures forever!"
  }, {
      Id: 223,
      Name: "Knowledge",
      Reference: "Genesis 2:17",
      Text: "but you shall not eat of the tree of the knowledge of good and evil; for in the day that you eat of it, you will surely die.”"
  }, {
      Id: 224,
      Name: "Knowledge",
      Reference: "Colossians 1:9",
      Text: "For this cause, we also, since the day we heard this, don’t cease praying and making requests for you, that you may be filled with the knowledge of his will in all spiritual wisdom and understanding,"
  }, {
      Id: 225,
      Name: "Knowledge",
      Reference: "Genesis 3:22",
      Text: "Yahweh God said, “Behold, the man has become like one of us, knowing good and evil. Now, lest he reach out his hand, and also take of the tree of life, and eat, and live forever—”"
  }, {
      Id: 226,
      Name: "Knowledge",
      Reference: "James 3:17",
      Text: "But the wisdom that is from above is first pure, then peaceful, gentle, reasonable, full of mercy and good fruits, without partiality, and without hypocrisy."
  }, {
      Id: 227,
      Name: "Knowledge",
      Reference: "1 Corinthians 8:1",
      Text: "Now concerning things sacrificed to idols: We know that we all have knowledge. Knowledge puffs up, but love builds up."
  }, {
      Id: 228,
      Name: "Knowledge",
      Reference: "Daniel 12:4",
      Text: "But you, Daniel, shut up the words and seal the book, even to the time of the end. Many will run back and forth, and knowledge will be increased.”"
  }, {
      Id: 229,
      Name: "Knowledge",
      Reference: "Isaiah 11:2",
      Text: "Yahweh’s Spirit will rest on him: the spirit of wisdom and understanding, the spirit of counsel and might, the spirit of knowledge and of the fear of Yahweh."
  }, {
      Id: 230,
      Name: "Knowledge",
      Reference: "Psalms 19:2",
      Text: "But the wisdom that is from above is first pure, then peaceful, gentle, reasonable, full of mercy and good fruits, without partiality, and without hypocrisy."
  }, {
      Id: 231,
      Name: "Knowledge",
      Reference: "James 3:13",
      Text: "Who is wise and understanding among you? Let him show by his good conduct that his deeds are done in gentleness of wisdom."
  }, {
      Id: 232,
      Name: "Knowledge",
      Reference: "Proverbs 24:14",
      Text: "so you shall know wisdom to be to your soul. If you have found it, then there will be a reward: Your hope will not be cut off."
  }, {
      Id: 233,
      Name: "Knowledge",
      Reference: "1 Kings 3:9",
      Text: "Give your servant therefore an understanding heart to judge your people, that I may discern between good and evil; for who is able to judge this great people of yours?”"
  }, {
      Id: 234,
      Name: "Knowledge",
      Reference: "Proverbs 20:15",
      Text: "There is gold and abundance of rubies, but the lips of knowledge are a rare jewel."
  }, {
      Id: 235,
      Name: "Knowledge",
      Reference: "Colossians 2:2",
      Text: "that their hearts may be comforted, they being knit together in love, and gaining all riches of the full assurance of understanding, that they may know the mystery of God, both of the Father and of Christ, "
  }, {
      Id: 236,
      Name: "Knowledge",
      Reference: "Isaiah 11:9",
      Text: "They will not hurt nor destroy in all my holy mountain; for the earth will be full of the knowledge of Yahweh, as the waters cover the sea."
  }, {
      Id: 237,
      Name: "Knowledge",
      Reference: "Colossians 2:3",
      Text: "in whom all the treasures of wisdom and knowledge are hidden."
  }, {
      Id: 238,
      Name: "Knowledge",
      Reference: "John 8:32",
      Text: "You will know the truth, and the truth will make you free.”"
  }, {
      Id: 239,
      Name: "Knowledge",
      Reference: "Proverbs 11:2",
      Text: "When pride comes, then comes shame, but with humility comes wisdom."
  }, {
      Id: 240,
      Name: "Knowledge",
      Reference: "Luke 1:77",
      Text: "to give knowledge of salvation to his people by the remission of their sins,"
  }, {
      Id: 241,
      Name: "Knowledge",
      Reference: "Proverbs 3:20",
      Text: "By his knowledge, the depths were broken up, and the skies drop down the dew."
  }, {
      Id: 242,
      Name: "Knowledge",
      Reference: "2 Peter 3:18",
      Text: "But grow in the grace and knowledge of our Lord and Savior Jesus Christ. To him be the glory both now and forever. Amen."
  }, {
      Id: 243,
      Name: "Knowledge",
      Reference: "Romans 11:33",
      Text: "Oh the depth of the riches both of the wisdom and the knowledge of God! How unsearchable are his judgments, and his ways past tracing out!"
  }, {
      Id: 244,
      Name: "Knowledge",
      Reference: "Proverbs 3:7",
      Text: "Don’t be wise in your own eyes. Fear Yahweh, and depart from evil."
  }, {
      Id: 245,
      Name: "Knowledge",
      Reference: "Psalms 90:12",
      Text: "So teach us to count our days, that we may gain a heart of wisdom."
  }, {
      Id: 246,
      Name: "Knowledge",
      Reference: "Job 28:28",
      Text: "To man he said, `Behold, the fear of the Lord, that is wisdom. To depart from evil is understanding.’"
  }, {
      Id: 247,
      Name: "Knowledge",
      Reference: "Habakkuk 2:14",
      Text: "For the earth will be filled with the knowledge of Yahweh’s glory, as the waters cover the sea."
  }, {
      Id: 248,
      Name: "Knowledge",
      Reference: "Proverbs 16:16",
      Text: "How much better it is to get wisdom than gold! Yes, to get understanding is to be chosen rather than silver."
  }, {
      Id: 249,
      Name: "Knowledge",
      Reference: "Isaiah 40:28",
      Text: "Haven’t you known? Haven’t you heard? The everlasting God, Yahweh, the Creator of the ends of the earth, doesn’t faint. He isn’t weary. His understanding is unsearchable."
  }, {
      Id: 250,
      Name: "Knowledge",
      Reference: "Ecclesiastes 1:18",
      Text: "For in much wisdom is much grief"
  }, {
      Id: 251,
      Name: "Knowledge",
      Reference: "Proverbs 1:7",
      Text: "The fear of the LORD is the beginning of knowledge, but the foolish despise wisdom and instruction."
  }, {
      Id: 252,
      Name: "Knowledge",
      Reference: "Job 12:12",
      Text: "With aged men is wisdom, in length of days understanding."
  }, {
      Id: 253,
      Name: "Knowledge",
      Reference: "2 Peter 1:5",
      Text: "Yes, and for this very cause adding on your part all diligence, in your faith supply moral excellence; and in moral excellence, knowledge;"
  }, {
      Id: 254,
      Name: "Knowledge",
      Reference: "1 Corinthians 13:9",
      Text: "For we know in part and we prophesy in part; but when that which is complete has come, then that which is partial will be done away with. "
  }, {
      Id: 255,
      Name: "Knowledge",
      Reference: "Malachi 2:7",
      Text: "For the priest’s lips should keep knowledge, and they should seek the law at his mouth; for he is the messenger of Yahweh of Armies."
  }, {
      Id: 256,
      Name: "Knowledge",
      Reference: "Proverbs 18:2",
      Text: "A fool has no delight in understanding, but only in revealing his own opinion."
  }, {
      Id: 257,
      Name: "Knowledge",
      Reference: "Proverbs 13:10",
      Text: "Pride only breeds quarrels, but wisdom is with people who take advice."
  },  {
      Id: 259,
      Name: "Knowledge",
      Reference: "1 Corinthians 3:18",
      Text: "Let no one deceive himself. If anyone thinks that he is wise among you in this world, let him become a fool that he may become wise."
  }, {
      Id: 260,
      Name: "Knowledge",
      Reference: "Proverbs 19:8",
      Text: "He who gets wisdom loves his own soul. He who keeps understanding shall find good."
  }, {
      Id: 261,
      Name: "Knowledge",
      Reference: "Proverbs 19:2",
      Text: "It isn’t good to have zeal without knowledge, nor being hasty with one’s feet and missing the way."
  }, {
      Id: 262,
      Name: "Knowledge",
      Reference: "1 Corinthians 13:2",
      Text: "If I have the gift of prophecy, and know all mysteries and all knowledge, and if I have all faith, so as to remove mountains, but don’t have love, I am nothing."
  }, {
      Id: 263,
      Name: "Knowledge",
      Reference: "Proverbs 15:33",
      Text: "The fear of Yahweh teaches wisdom. Before honor is humility."
  }, {
      Id: 264,
      Name: "Knowledge",
      Reference: "Genesis 2:9",
      Text: "Out of the ground Yahweh God made every tree to grow that is pleasant to the sight, and good for food, including the tree of life in the middle of the garden and the tree of the knowledge of good and evil."
  }, {
      Id: 265,
      Name: "Knowledge",
      Reference: "James 3:13",
      Text: "Who is wise and understanding among you? Let him show by his good conduct that his deeds are done in gentleness of wisdom."
  }, {
      Id: 266,
      Name: "Knowledge",
      Reference: "Colossians 2:8",
      Text: "Be careful that you don’t let anyone rob you through his philosophy and vain deceit, after the tradition of men, after the elemental spirits of the world, and not after Christ."
  }, {
      Id: 267,
      Name: "Knowledge",
      Reference: "Luke 11:52",
      Text: "Woe to you lawyers! For you took away the key of knowledge. You didn’t enter in yourselves, and those who were entering in, you hindered.”"
  }, {
      Id: 268,
      Name: "Knowledge",
      Reference: "Proverbs 4:7",
      Text: "Wisdom is supreme. Get wisdom.Yes, though it costs all your possessions, get understanding."
  }, {
      Id: 269,
      Name: "Knowledge",
      Reference: "1 Timothy 2:4",
      Text: "who desires all people to be saved and come to full knowledge of the truth."
  }, {
      Id: 270,
      Name: "Knowledge",
      Reference: "Matthew 7:24",
      Text: "“Everyone therefore who hears these words of mine and does them, I will liken him to a wise man who built his house on a rock."
  }, {
      Id: 271,
      Name: "Knowledge",
      Reference: "Daniel 2:23",
      Text: "I thank you and praise you,O God of my fathers, who have given me wisdom and might, and have now made known to me what we desired of you; for you have made known to us the king’s matter.”"
  }, {
      Id: 272,
      Name: "Knowledge",
      Reference: "2 Timothy 3:7",
      Text: "always learning and never able to come to the knowledge of the truth."
  }, {
      Id: 273,
      Name: "Knowledge",
      Reference: "Daniel 2:21",
      Text: "He changes the times and the seasons. He removes kings and sets up kings. He gives wisdom to the wise, and knowledge to those who have understanding."
  }, {
      Id: 274,
      Name: "Knowledge",
      Reference: "Genesis 4:1",
      Text: "The man knew Eve his wife. She conceived, and gave birth to Cain, and said, “I have gotten a man with Yahweh’s help.”"
  }, {
      Id: 275,
      Name: "Knowledge",
      Reference: "Philippians 3:8",
      Text: "Yes most certainly, and I count all things to be a loss for the excellency of the knowledge of Christ Jesus, my Lord, for whom I suffered the loss of all things, and count them nothing but refuse, that I may gain Christ"
  }, {
      Id: 276,
      Name: "Knowledge",
      Reference: "Ephesians 5:15-16",
      Text: "Therefore watch carefully how you walk, not as unwise, but as wise, redeeming the time, because the days are evil."
  }, {
      Id: 277,
      Name: "Knowledge",
      Reference: "Isaiah 33:6",
      Text: "There will be stability in your times, abundance of salvation, wisdom, and knowledge. The fear of Yahweh is your treasure."
  }, {
      Id: 278,
      Name: "Knowledge",
      Reference: "Proverbs 14:29",
      Text: "He who is slow to anger has great understanding, but he who has a quick temper displays folly."
  }, {
      Id: 279,
      Name: "Knowledge",
      Reference: "Colossians 1:9",
      Text: "For this cause, we also, since the day we heard this, don’t cease praying and making requests for you, that you may be filled with the knowledge of his will in all spiritual wisdom and understanding,"
  }, {
      Id: 280,
      Name: "Knowledge",
      Reference: "John 3:16-17",
      Text: "For God so loved the world, that he gave his only born Son, that whoever believes in him should not perish, but have eternal life. For God didn’t send his Son into the world to judge the world, but that the world should be saved through him."
  }, {
      Id: 281,
      Name: "Knowledge",
      Reference: "Daniel 1:17",
      Text: "Now as for these four youths, God gave them knowledge and skill in all learning and wisdom; and Daniel had understanding in all visions and dreams."
  }, {
      Id: 282,
      Name: "Knowledge",
      Reference: "Colossians 4:5-6",
      Text: "Walk in wisdom toward those who are outside, redeeming the time. Let your speech always be with grace, seasoned with salt, that you may know how you ought to answer each one."
  }, {
      Id: 283,
      Name: "Knowledge",
      Reference: "Psalms 91:14",
      Text: "“Because he has set his love on me, therefore I will deliver him. I will set him on high, because he has known my name."
  }, {
      Id: 284,
      Name: "Knowledge",
      Reference: "1 Corinthians 1:25",
      Text: "because the foolishness of God is wiser than men, and the weakness of God is stronger than men."
  }, {
      Id: 285,
      Name: "Knowledge",
      Reference: "Proverbs 16:22",
      Text: "Understanding is a fountain of life to one who has it, but the punishment of fools is their folly."
  }, {
      Id: 286,
      Name: "Knowledge",
      Reference: "Proverbs 10:8",
      Text: "The wise in heart accept commandments, but a chattering fool will fall."
  }, {
      Id: 287,
      Name: "Knowledge",
      Reference: "Isaiah 28:29",
      Text: "This also comes out from Yahweh of Armies, who is wonderful in counsel, and excellent in wisdom."
  }, {
      Id: 288,
      Name: "Knowledge",
      Reference: "Proverbs 2:11",
      Text: "Discretion will watch over you. Understanding will keep you,"
  }, {
      Id: 289,
      Name: "Knowledge",
      Reference: "Psalms 33:11",
      Text: "The counsel of Yahweh stands fast forever, the thoughts of his heart to all generations."
  }, {
      Id: 290,
      Name: "Knowledge",
      Reference: "2 Chronicles 1:10",
      Text: "Now give me wisdom and knowledge, that I may go out and come in before this people; for who can judge this great people of yours?”"
  }, {
      Id: 291,
      Name: "Knowledge",
      Reference: "Genesis 3:2",
      Text: "The woman said to the serpent, “We may eat fruit from the trees of the garden, but not the fruit of the tree which is in the middle of the garden."
  }, {
      Id: 292,
      Name: "Knowledge",
      Reference: "1 Corinthians 1:30",
      Text: "Because of him, you are in Christ Jesus, who was made to us wisdom from God, and righteousness and sanctification, and redemption,"
  }, {
      Id: 293,
      Name: "Knowledge",
      Reference: "Hebrews 12:11",
      Text: "All chastening seems for the present to be not joyous but grievous"
  }, {
      Id: 294,
      Name: "Knowledge",
      Reference: "Proverbs 19:20",
      Text: "Listen to counsel and receive instruction, that you may be wise in your latter end."
  }, {
      Id: 295,
      Name: "Knowledge",
      Reference: "2 Corinthians 8:7",
      Text: "But as you abound in everything— in faith, utterance, knowledge, all earnestness, and in your love to us—see that you also abound in this grace."
  }, {
      Id: 296,
      Name: "Knowledge",
      Reference: "Romans 12:2",
      Text: "Don’t be conformed to this world, but be transformed by the renewing of your mind, so that you may prove what is the good, well-pleasing, and perfect will of God."
  }, {
      Id: 297,
      Name: "Knowledge",
      Reference: "2 Timothy 2:7",
      Text: "Consider what I say, and may the Lord give you understanding in all things."
  }, {
      Id: 298,
      Name: "Knowledge",
      Reference: "1 Corinthians 10:13",
      Text: "No temptation has taken you except what is common to man. God is faithful, who will not allow you to be tempted above what you are able, but will with the temptation also make the way of escape, that you may be able to endure it."
  }, {
      Id: 299,
      Name: "Knowledge",
      Reference: "Matthew 5:48",
      Text: "Therefore you shall be perfect, just as your Father in heaven is perfect."
  }, {
      Id: 300,
      Name: "Love",
      Reference: "John 3:16",
      Text: "For God so loved the world, that he gave his only born Son, that whoever believes in him should not perish, but have eternal life.",
    Lie: "God doesn't love people and he certainly does not love you.",
    NPCSays: ["How do I know God loves me?", "Is there any way I can have eternal life?"]
  }, {
      Id: 301,
      Name: "Love",
      Reference: "1 Corinthians 16:14",
      Text: "Let all that you do be done in love.",
    Lie: "It is OK to do unloving things sometimes if the occasion demands it.",
    NPCSays: ["It is OK to hate if that is what people deserve."]
  }, {
      Id: 302,
      Name: "Love",
      Reference: "1 Corinthians 13:6-7",
      Text: "Love doesn’t rejoice in unrighteousness, but rejoices with the truth; bears all things, believes all things, hopes all things, and endures all things.",
    Lie: "Sin and lies are fun but you have every right to be irritated with idiots.",
    NPCSays: ["What is love anyway?", "It is fun to deceive people."]
  }, {
      Id: 303,
      Name: "Love",
      Reference: "1 John 4:8",
      Text: "He who doesn’t love doesn’t know God, for God is love.",
    Lie: "You don't have to love to know God.",
    NPCSays: ["How can I know who is a genuine follower of the LORD?"]
  }, {
      Id: 304,
      Name: "Love",
      Reference: "1 Peter 4:8",
      Text: "And above all things be earnest in your love among yourselves, for love covers a multitude of sins.",
    Lie: "If someone does you wrong, make them feel bad about it."
  }, {
      Id: 305,
      Name: "Love",
      Reference: "Romans 5:8",
      Text: "But God commends his own love toward us, in that while we were yet sinners, Christ died for us.",
    Lie: "God won't love you unless you prove yourself worthy."
  }, {
      Id: 306,
      Name: "Love",
      Reference: "Colossians 3:14",
      Text: "Above all these things, walk in love, which is the bond of perfection.",
    Lie: "There are more important things than love."
  }, {
      Id: 307,
      Name: "Love",
      Reference: "John 13:34-35",
      Text: "A new commandment I give to you, that you love one another. Just as I have loved you, you also love one another. By this everyone will know that you are my disciples, if you have love for one another.”",
    Lie: "Loving like Jesus Christ is impossible and God doesn't expect it of you."
  }, 
  
  {
      Id: 308,
      Name: "Love",
      Reference: "1 John 4:19",
      Text: "We love him, because he first loved us.",
    Lie: "God doesn't love you."
  }, {
      Id: 309,
      Name: "Love",
      Reference: "Proverbs 10:12",
      Text: "Hatred stirs up strife, but love covers all wrongs.",
    Lie: "People really need to be told all their faults."
  }, {
      Id: 310,
      Name: "Love",
      Reference: "Mark 12:29-31",
      Text: "The second is like this: ‘You shall love your neighbor as yourself.’ There is no other commandment greater than these.”",
    Lie: "Religion is a personal matter between you and God and has nothing to do with others."
  }, {
      Id: 311,
      Name: "Love",
      Reference: "1 John 4:7",
      Text: "Beloved, let’s love one another, for love is of God; and everyone who loves has been born of God and knows God.",
    Lie: "You can love without God."
  }, {
      Id: 312,
      Name: "Love",
      Reference: "1 John 4:18",
      Text: "There is no fear in love; but perfect love casts out fear, because fear has punishment. He who fears is not made perfect in love.",
    Lie: "If you love people, you will get hurt. It isn't worth it."
  }, {
      Id: 313,
      Name: "Love",
      Reference: "John 13:35",
      Text: "By this everyone will know that you are my disciples, if you have love for one another.”",
    Lie: "Disciples of Jesus don't necessarily have love for one another."
  }, {
      Id: 314,
      Name: "Love",
      Reference: "Matthew 22:36-38",
      Text: "“Teacher, which is the greatest commandment in the law?” Jesus said to him, “‘You shall love the Lord your God with all your heart, with all your soul, and with all your mind.’ This is the first and great commandment.",
    Lie: "God doesn't expect you to be wholehearted for him. That is impossible."
  }, 
  
  {
      Id: 315,
      Name: "Love",
      Reference: "John 15:13",
      Text: "Greater love has no one than this, that someone lay down his life for his friends.",
    Lie: "At the end of the day, it is every man for himself."
  }, {
      Id: 316,
      Name: "Love",
      Reference: "1 Corinthians 13:13",
      Text: "But now faith, hope, and love remain— these three. The greatest of these is love.",
    Lie: "Personal power is more important than love."
  }, 
  {
      Id: 317,
      Name: "Love",
      Reference: "Ephesians 5:25",
      Text: "Husbands, love your wives, even as Christ also loved the assembly and gave himself up for her,",
    Lie: "Husbands should pursue their own interests first."
  }, {
      Id: 318,
      Name: "Love",
      Reference: "John 14:15",
      Text: "If you love me, keep my commandments.",
    Lie: "You can love God without keeping his commandments."
  }, {
      Id: 319,
      Name: "Love",
      Reference: "Ephesians 4:2",
      Text: "with all lowliness and humility, with patience, bearing with one another in love,",
    Lie: "Humility and lowliness is for losers."
  }, {
      Id: 320,
      Name: "Love",
      Reference: "Proverbs 17:17",
      Text: "A friend loves at all times"
  }, {
      Id: 321,
      Name: "Love",
      Reference: "1 John 3:1",
      Text: "See how great a love the Father has given to us, that we should be called children of God! For this cause the world doesn’t know us, because it didn’t know him."
  }, {
      Id: 322,
      Name: "Love",
      Reference: "1 John 4:16",
      Text: "We know and have believed the love which God has for us. God is love, and he who remains in love remains in God, and God remains in him."
  }, {
      Id: 323,
      Name: "Love",
      Reference: "Romans 13:8",
      Text: "Owe no one anything, except to love one another; for he who loves his neighbor has fulfilled the law."
  }, {
      Id: 324,
      Name: "Love",
      Reference: "Luke 6:35",
      Text: "But love your enemies, and do good, and lend, expecting nothing back; and your reward will be great, and you will be children of the Most High; for he is kind toward the unthankful and evil."
  }, {
      Id: 325,
      Name: "Love",
      Reference: "Romans 12:9",
      Text: "Let love be without hypocrisy. Abhor that which is evil. Cling to that which is good."
  }, {
      Id: 326,
      Name: "Love",
      Reference: "1 Corinthians 13:4-7",
      Text: "Love is patient and is kind. Love doesn’t envy. Love doesn’t brag, is not proud, doesn’t behave itself inappropriately, doesn’t seek its own way, is not provoked, takes no account of evil; doesn’t rejoice in unrighteousness, but rejoices with the truth; bears all things, believes all things, hopes all things, and endures all things."
  }, {
      Id: 327,
      Name: "Love",
      Reference: "Galatians 2:20",
      Text: "I have been crucified with Christ, and it is no longer I who live, but Christ lives in me. That life which I now live in the flesh, I live by faith in the Son of God, who loved me and gave himself up for me."
  }, {
      Id: 328,
      Name: "Love",
      Reference: "Romans 12:10",
      Text: "In love of the brothers be tenderly affectionate to one another; in honor prefer one another,"
  }, {
      Id: 329,
      Name: "Love",
      Reference: "Romans 13:10",
      Text: "Love doesn’t harm a neighbor. Love therefore is the fulfillment of the law."
  }, {
      Id: 330,
      Name: "Love",
      Reference: "1 John 3:18",
      Text: "My little children, let’s not love in word only, or with the tongue only, but in deed and truth."
  }, {
      Id: 331,
      Name: "Love",
      Reference: "Romans 8:38-39",
      Text: "For I am persuaded that neither death, nor life, nor angels, nor principalities, nor things present, nor things to come, nor powers, nor height, nor depth, nor any other created thing will be able to separate us from God’s love which is in Christ Jesus our Lord."
  }, {
      Id: 332,
      Name: "Love",
      Reference: "1 John 4:7-8",
      Text: "Beloved, let’s love one another, for love is of God; and everyone who loves has been born of God and knows God. He who doesn’t love doesn’t know God, for God is love."
  }, {
      Id: 333,
      Name: "Love",
      Reference: "Matthew 22:37-39",
      Text: "Jesus said to him, `You shall love the Lord your God with all your heart, with all your soul, and with all your mind.’ This is the first and great commandment. A second likewise is this, ‘You shall love your neighbor as yourself.’"
  }, {
      Id: 334,
      Name: "Love",
      Reference: "Ephesians 5:33",
      Text: "Nevertheless each of you must also love his own wife even as himself"
  }, {
      Id: 335,
      Name: "Love",
      Reference: "John 15:12",
      Text: "“This is my commandment, that you love one another, even as I have loved you."
  }, {
      Id: 336,
      Name: "Love",
      Reference: "Deuteronomy 7:9",
      Text: "Know therefore that Yahweh your God himself is God, the faithful God, who keeps covenant and loving kindness to a thousand generations with those who love him and keep his commandments,"
  }, {
      Id: 337,
      Name: "Love",
      Reference: "Zephaniah 3:17",
      Text: "Yahweh, your God, is among you, a mighty one who will save. He will rejoice over you with joy. He will calm you in his love. He will rejoice over you with singing."
  }, {
      Id: 338,
      Name: "Love",
      Reference: "Proverbs 17:9",
      Text: "He who covers an offense promotes love"
  }, {
      Id: 339,
      Name: "Love",
      Reference: "Galatians 5:22",
      Text: "But the fruit of the Spirit is love, joy, peace, patience, kindness, goodness, faith,"
  }, {
      Id: 340,
      Name: "Love",
      Reference: "Mark 12:31",
      Text: "The second is like this: ‘You shall love your neighbor as yourself.’ There is no other commandment greater than these.”"
  }, {
      Id: 341,
      Name: "Love",
      Reference: "1 Corinthians 13:2",
      Text: "If I have the gift of prophecy, and know all mysteries and all knowledge, and if I have all faith, so as to remove mountains, but don’t have love, I am nothing."
  }, {
      Id: 342,
      Name: "Love",
      Reference: "Proverbs 3:3-4",
      Text: "Don’t let kindness and truth forsake you. Bind them around your neck. Write them on the tablet of your heart. So you will find favor, and good understanding in the sight of God and man."
  }, {
      Id: 343,
      Name: "Love",
      Reference: "Romans 8:28",
      Text: "We know that all things work together for good for those who love God, for those who are called according to his purpose."
  }, {
      Id: 344,
      Name: "Love",
      Reference: "Ephesians 2:4-5",
      Text: "But God, being rich in mercy, for his great love with which he loved us, even when we were dead through our trespasses, made us alive together with Christ— by grace you have been saved—"
  }, {
      Id: 345,
      Name: "Love",
      Reference: "Ephesians 4:2-3",
      Text: "with all lowliness and humility, with patience, bearing with one another in love, being eager to keep the unity of the Spirit in the bond of peace."
  }, {
      Id: 346,
      Name: "Love",
      Reference: "1 Peter 5:6-7",
      Text: "Humble yourselves therefore under the mighty hand of God, that he may exalt you in due time, casting all your worries on him, because he cares for you."
  }, {
      Id: 347,
      Name: "Love",
      Reference: "Luke 6:31",
      Text: "“As you would like people to do to you, do exactly so to them."
  }, {
      Id: 348,
      Name: "Love",
      Reference: "Song of Songs 8:6",
      Text: "Set me as a seal on your heart, as a seal on your arm; for love is strong as death. Jealousy is as cruel as Sheol. "
  }, {
      Id: 349,
      Name: "Love",
      Reference: "1 John 4:20",
      Text: "If a man says, “I love God,” and hates his brother, he is a liar; for he who doesn’t love his brother whom he has seen, how can he love God whom he has not seen?"
  }, {
      Id: 350,
      Name: "Love",
      Reference: "John 14:21",
      Text: "One who has my commandments and keeps them, that person is one who loves me. One who loves me will be loved by my Father, and I will love him, and will reveal myself to him.”"
  }, {
      Id: 351,
      Name: "Love",
      Reference: "Song of Songs 8:7",
      Text: "Many waters can’t quench love, neither can floods drown it. If a man would give all the wealth of his house for love, he would be utterly scorned."
  }, {
      Id: 352,
      Name: "Love",
      Reference: "Psalms 86:15",
      Text: "But you, Lord, are a merciful and gracious God, slow to anger, and abundant in loving kindness and truth."
  }, {
      Id: 353,
      Name: "Love",
      Reference: "1 John 3:16",
      Text: "By this we know love, because he laid down his life for us. And we ought to lay down our lives for the brothers."
  }, {
      Id: 354,
      Name: "Love",
      Reference: "1 John 4:12",
      Text: "No one has seen God at any time. If we love one another, God remains in us, and his love has been perfected in us."
  }, {
      Id: 355,
      Name: "Love",
      Reference: "Song of Songs 8:6",
      Text: "Set me as a seal on your heart, as a seal on your arm; for love is strong as death. Jealousy is as cruel as Sheol. Its flashes are flashes of fire, a very flame of Yahweh."
  }, {
      Id: 356,
      Name: "Love",
      Reference: "Matthew 6:24",
      Text: "“No one can serve two masters, for either he will hate the one and love the other, or else he will be devoted to one and despise the other. You can’t serve both God and Mammon."
  }, {
      Id: 357,
      Name: "Love",
      Reference: "Jeremiah 31:3",
      Text: "Yahweh appeared of old to me, saying,“Yes, I have loved you with an everlasting love. Therefore I have drawn you with loving kindness."
  }, {
      Id: 358,
      Name: "Love",
      Reference: "1 Peter 1:22",
      Text: "Seeing you have purified your souls in your obedience to the truth through the Spirit in sincere brotherly affection, love one another from the heart fervently,"
  }, {
      Id: 359,
      Name: "Love",
      Reference: "Matthew 22:37",
      Text: "Jesus said to him, `You shall love the Lord your God with all your heart, with all your soul, and with all your mind.’"
  }, {
      Id: 360,
      Name: "Love",
      Reference: "John 13:34",
      Text: "A new commandment I give to you, that you love one another. Just as I have loved you, you also love one another."
  }, {
      Id: 361,
      Name: "Love",
      Reference: "Psalms 63:3",
      Text: "Because your loving kindness is better than life, my lips shall praise you."
  }, {
      Id: 362,
      Name: "Love",
      Reference: "Galatians 5:22-23",
      Text: "But the fruit of the Spirit is love, joy, peace, patience, kindness, goodness, faith, gentleness, and self-control. Against such things there is no law."
  }, {
      Id: 363,
      Name: "Love",
      Reference: "Romans 5:5",
      Text: "and hope doesn’t disappoint us, because God’s love has been poured into our hearts through the Holy Spirit who was given to us."
  }, {
      Id: 364,
      Name: "Love",
      Reference: "John 14:23",
      Text: "Jesus answered him,“If a man loves me, he will keep my word. My Father will love him, and we will come to him and make our home with him."
  }, {
      Id: 365,
      Name: "Love",
      Reference: "1 John 4:21",
      Text: "This commandment we have from him, that he who loves God should also love his brother."
  }, {
      Id: 366,
      Name: "Love",
      Reference: "1 John 4:11",
      Text: "Beloved, if God loved us in this way, we also ought to love one another."
  }, {
      Id: 368,
      Name: "Love",
      Reference: "1 Corinthians 13:1-3",
      Text: "If I speak with the languages of men and of angels, but don’t have love, I have become sounding brass or a clanging cymbal. If I have the gift of prophecy, and know all mysteries and all knowledge, and if I have all faith, so as to remove mountains, but don’t have love, I am nothing. If I give away all my goods to feed the poor, and if I give my body to be burned, but don’t have love, it profits me nothing."
  }, {
      Id: 369,
      Name: "Love",
      Reference: "Ephesians 4:32",
      Text: "And be kind to one another, tender hearted, forgiving each other, just as God also in Christ forgave you."
  }, {
      Id: 370,
      Name: "Love",
      Reference: "Leviticus 19:18",
      Text: "You shall not take vengeance, nor bear any grudge against the children of your people; but you shall love your neighbor as yourself. I am Yahweh."
  }, {
      Id: 371,
      Name: "Love",
      Reference: "1 Corinthians 13:1",
      Text: "If I speak with the languages of men and of angels, but don’t have love, I have become sounding brass or a clanging cymbal."
  }, {
      Id: 372,
      Name: "Love",
      Reference: "Philippians 2:2",
      Text: "make my joy full by being like-minded, having the same love, being of one accord, of one mind;"
  }, {
      Id: 373,
      Name: "Love",
      Reference: "1 Corinthians 13:4",
      Text: "Love is patient and is kind. Love doesn’t envy. Love doesn’t brag, is not proud,"
  }, {
      Id: 374,
      Name: "Love",
      Reference: "Genesis 29:20",
      Text: "Jacob served seven years for Rachel. They seemed to him but a few days, for the love he had for her."
  }, {
      Id: 375,
      Name: "Love",
      Reference: "Romans 8:35",
      Text: "Who shall separate us from the love of Christ? Could oppression, or anguish, or persecution, or famine, or nakedness, or peril, or sword?"
  }, {
      Id: 376,
      Name: "Love",
      Reference: "Matthew 5:22",
      Text: "But I tell you that everyone who is angry with his brother without a cause will be in danger of the judgment. Whoever says to his brother, ‘Raca!’ will be in danger of the council. Whoever says, ‘ You fool!’ will be in danger of the fire of Gehenna."
  }, {
      Id: 377,
      Name: "Love",
      Reference: "Matthew 5:44-45",
      Text: "But I tell you, love your enemies, bless those who curse you, do good to those who hate you, and pray for those who mistreat you and persecute you, that you may be children of your Father who is in heaven"
  }, {
      Id: 378,
      Name: "Love",
      Reference: "Proverbs 15:17",
      Text: "Better is a dinner of herbs, where love is, than a fattened calf with hatred."
  }, {
      Id: 379,
      Name: "Love",
      Reference: "John 15:12-13",
      Text: "“This is my commandment, that you love one another, even as I have loved you. Greater love has no one than this, that someone lay down his life for his friends."
  }, {
      Id: 380,
      Name: "Love",
      Reference: "Proverbs 8:17",
      Text: "I love those who love me.Those who seek me diligently will find me."
  }, {
      Id: 381,
      Name: "Love",
      Reference: "Galatians 5:13",
      Text: "For you, brothers, were called for freedom. Only don’t use your freedom as an opportunity for the flesh, but through love be servants to one another."
  }, {
      Id: 382,
      Name: "Love",
      Reference: "1 Corinthians 13:4-5",
      Text: "Love is patient and is kind. Love doesn’t envy. Love doesn’t brag, is not proud, doesn’t behave itself inappropriately, doesn’t seek its own way, is not provoked, takes no account of evil;"
  }, {
      Id: 383,
      Name: "Love",
      Reference: "Psalms 143:8",
      Text: "Cause me to hear your loving kindness in the morning, for I trust in you.Cause me to know the way in which I should walk, for I lift up my soul to you."
  }, {
      Id: 384,
      Name: "Love",
      Reference: "Isaiah 43:4",
      Text: "Since you have been precious and honored in my sight, and I have loved you, therefore I will give people in your place, and nations instead of your life."
  }, {
      Id: 385,
      Name: "Love",
      Reference: "2 Corinthians 5:14",
      Text: "For the love of Christ compels us; because we judge thus: that one died for all, therefore all died."
  }, {
      Id: 386,
      Name: "Love",
      Reference: "Song of Songs 4:10",
      Text: "How beautiful is your love, my sister, my bride! How much better is your love than wine, the fragrance of your perfumes than all kinds of spices!"
  }, {
      Id: 387,
      Name: "Love",
      Reference: "James 2:8",
      Text: "However, if you fulfill the royal law according to the Scripture, “You shall love your neighbor as yourself,” you do well."
  }, {
      Id: 388,
      Name: "Love",
      Reference: "Song of Songs 2:16",
      Text: "My beloved is mine, and I am his.He browses among the lilies."
  }, {
      Id: 389,
      Name: "Love",
      Reference: "Psalms 18:1",
      Text: "I love you, Yahweh, my strength."
  }, {
      Id: 390,
      Name: "Love",
      Reference: "Ephesians 3:17-19",
      Text: "that Christ may dwell in your hearts through faith, to the end that you, being rooted and grounded in love, may be strengthened to comprehend with all the saints what is the width and length and height and depth, and to know Christ’s love which surpasses knowledge, that you may be filled with all the fullness of God."
  }, {
      Id: 391,
      Name: "Love",
      Reference: "Proverbs 5:19",
      Text: "A loving doe and a graceful deer— let her breasts satisfy you at all times. Be captivated always with her love."
  }, {
      Id: 392,
      Name: "Love",
      Reference: "Song of Songs 1:2",
      Text: "Let him kiss me with the kisses of his mouth"
  }, {
      Id: 393,
      Name: "Love",
      Reference: "John 3:16-17",
      Text: "For God so loved the world, that he gave his only born Son, that whoever believes in him should not perish, but have eternal life. For God didn’t send his Son into the world to judge the world, but that the world should be saved through him."
  }, {
      Id: 394,
      Name: "Love",
      Reference: "1 John 3:16",
      Text: "By this we know love, because he laid down his life for us. And we ought to lay down our lives for the brothers."
  }, {
      Id: 395,
      Name: "Love",
      Reference: "Galatians 5:13-14",
      Text: "For you, brothers, were called for freedom. Only don’t use your freedom as an opportunity for the flesh, but through love be servants to one another. For the whole law is fulfilled in one word, in this: “You shall love your neighbor as yourself.”"
  }, {
      Id: 396,
      Name: "Love",
      Reference: "Matthew 5:43-44",
      Text: "`You have heard that it was said, ‘ You shall love your neighbor and hate your enemy.’ But I tell you, love your enemies, bless those who curse you, do good to those who hate you, and pray for those who mistreat you and persecute you,"
  }, {
      Id: 397,
      Name: "Love",
      Reference: "Romans 12:9-10",
      Text: "Let love be without hypocrisy. Abhor that which is evil. Cling to that which is good. In love of the brothers be tenderly affectionate to one another; in honor prefer one another,"
  }, {
      Id: 398,
      Name: "Love",
      Reference: "Proverbs 18:22",
      Text: "Whoever finds a wife finds a good thing, and obtains favor of Yahweh."
  }, {
      Id: 399,
      Name: "Love",
      Reference: "Matthew 10:37",
      Text: "He who loves father or mother more than me is not worthy of me"
  }, {
      Id: 400,
      Name: "Wisdom",
      Reference: "1 Corinthians 14:33",
      Text: "for God is not a God of confusion but of peace, as in all the assemblies of the saints."
  }, {
      Id: 401,
      Name: "Wisdom",
      Reference: "2 Timothy 2:7",
      Text: "Consider what I say, and may the Lord give you understanding in all things."
  }, {
      Id: 402,
      Name: "Wisdom",
      Reference: "1 John 4:1",
      Text: "Beloved, don’t believe every spirit, but test the spirits, whether they are of God, because many false prophets have gone out into the world."
  }, {
      Id: 403,
      Name: "Wisdom",
      Reference: "1 Peter 5:8",
      Text: "Be sober and self-controlled. Be watchful. Your adversary, the devil, walks around like a roaring lion, seeking whom he may devour."
  }, {
      Id: 404,
      Name: "Wisdom",
      Reference: "Philippians 4:8-9",
      Text: "Finally, brothers, whatever things are true, whatever things are honorable, whatever things are just, whatever things are pure, whatever things are lovely, whatever things are of good report: if there is any virtue and if there is anything worthy of praise, think about these things. Do the things which you learned, received, heard, and saw in me, and the God of peace will be with you."
  }, {
      Id: 405,
      Name: "Wisdom",
      Reference: "Psalms 119:169",
      Text: "Let my cry come before you, Yahweh. Give me understanding according to your word."
  }, {
      Id: 406,
      Name: "Wisdom",
      Reference: "Psalms 119:34",
      Text: "Give me understanding, and I will keep your law.Yes, I will obey it with my whole heart."
  }, {
      Id: 407,
      Name: "Wisdom",
      Reference: "Matthew 7:7",
      Text: "“Ask, and it will be given you. Seek, and you will find. Knock, and it will be opened for you."
  }, {
      Id: 408,
      Name: "Wisdom",
      Reference: "John 16:13",
      Text: "However, when he, the Spirit of truth, has come, he will guide you into all truth, for he will not speak from himself; but whatever he hears, he will speak. He will declare to you things that are coming."
  }, {
      Id: 409,
      Name: "Wisdom",
      Reference: "Hebrews 13:8",
      Text: "Jesus Christ is the same yesterday, today, and forever."
  }, {
      Id: 410,
      Name: "Wisdom",
      Reference: "Isaiah 40:31",
      Text: "but those who wait for Yahweh will renew their strength. They will mount up with wings like eagles. They will run, and not be weary. They will walk, and not faint."
  }, {
      Id: 411,
      Name: "Wisdom",
      Reference: "2 Corinthians 4:8",
      Text: "We are pressed on every side, yet not crushed; perplexed, yet not to despair;"
  }, {
      Id: 412,
      Name: "Wisdom",
      Reference: "Proverbs 3:5-6",
      Text: "Trust in the LORD with all your heart, and don’t lean on your own understanding. In all your ways acknowledge him, and he will make your paths straight."
  }, {
      Id: 413,
      Name: "Wisdom",
      Reference: "Jeremiah 17:9",
      Text: "The heart is deceitful above all things and it is exceedingly corrupt. Who can know it?"
  }, {
      Id: 414,
      Name: "Wisdom",
      Reference: "Psalms 119:125",
      Text: "I am your servant. Give me understanding, that I may know your testimonies."
  }, {
      Id: 415,
      Name: "Wisdom",
      Reference: "1 Timothy 5:8",
      Text: "But if anyone doesn’t provide for his own, and especially his own household, he has denied the faith and is worse than an unbeliever."
  }, {
      Id: 416,
      Name: "Wisdom",
      Reference: "Deuteronomy 28:20",
      Text: "Yahweh will send on you cursing, confusion, and rebuke in all that you put your hand to do, until you are destroyed and until you perish quickly, because of the evil of your doings, by which you have forsaken me. "
  }, {
      Id: 417,
      Name: "Wisdom",
      Reference: "Proverbs 28:5",
      Text: "Evil men don’t understand justice"
  }, {
      Id: 418,
      Name: "Wisdom",
      Reference: "John 14:26",
      Text: "But the Counselor, the Holy Spirit, whom the Father will send in my name, will teach you all things, and will remind you of all that I said to you."
  }, {
      Id: 419,
      Name: "Wisdom",
      Reference: "2 Timothy 3:16-17",
      Text: "Every Scripture is God-breathed and profitable for teaching, for reproof, for correction, and for instruction in righteousness, that each person who belongs to God may be complete, thoroughly equipped for every good work."
  }, {
      Id: 420,
      Name: "Wisdom",
      Reference: "Psalms 71:1",
      Text: "In you, Yahweh, I take refuge. Never let me be disappointed."
  }, {
      Id: 421,
      Name: "Wisdom",
      Reference: "John 14:15",
      Text: "If you love me, keep my commandments."
  }, {
      Id: 422,
      Name: "Wisdom",
      Reference: "Romans 12:19",
      Text: "Don’t seek revenge yourselves, beloved, but give place to God’s wrath. For it is written, “Vengeance belongs to me; I will repay, says the Lord.”"
  }, {
      Id: 423,
      Name: "Wisdom",
      Reference: "John 16:33",
      Text: "I have told you these things, that in me you may have peace. In the world you have trouble; but cheer up! I have overcome the world.”"
  }, {
      Id: 424,
      Name: "Wisdom",
      Reference: "Proverbs 25:26",
      Text: "Like a muddied spring and a polluted well, so is a righteous man who gives way before the wicked."
  }, {
      Id: 425,
      Name: "Wisdom",
      Reference: "2 Timothy 1:7",
      Text: "For God didn’t give us a spirit of fear, but of power, love, and self-control."
  }, {
      Id: 426,
      Name: "Wisdom",
      Reference: "Isaiah 45:16",
      Text: "They will be disappointed, yes, confounded, all of them. Those who are makers of idols will go into confusion together."
  }, {
      Id: 427,
      Name: "Wisdom",
      Reference: "Jeremiah 17:10",
      Text: "“I, Yahweh, search the mind. I try the heart,even to give every man according to his ways, according to the fruit of his doings.”"
  }, {
      Id: 428,
      Name: "Wisdom",
      Reference: "1 Peter 5:7",
      Text: "casting all your worries on him, because he cares for you."
  }, {
      Id: 429,
      Name: "Wisdom",
      Reference: "James 3:16",
      Text: "For where jealousy and selfish ambition are, there is confusion and every evil deed."
  }, {
      Id: 430,
      Name: "Wisdom",
      Reference: "Malachi 3:6",
      Text: "“For I, Yahweh, don’t change; therefore you, sons of Jacob, are not consumed."
  }, {
      Id: 431,
      Name: "Wisdom",
      Reference: "Deuteronomy 28:47-48",
      Text: "Because you didn’t serve Yahweh your God with joyfulness and with gladness of heart, by reason of the abundance of all things; therefore you will serve your enemies whom Yahweh sends against you, in hunger, in thirst, in nakedness, and in lack of all things. He will put an iron yoke on your neck until he has destroyed you."
  }, {
      Id: 432,
      Name: "Wisdom",
      Reference: "Psalms 119:144",
      Text: "Your testimonies are righteous forever. Give me understanding, that I may live."
  }, {
      Id: 433,
      Name: "Wisdom",
      Reference: "Luke 10:27",
      Text: "He answered, “You shall love the Lord your God with all your heart, with all your soul, with all your strength, and with all your mind; and your neighbor as yourself.”"
  }, {
      Id: 434,
      Name: "Wisdom",
      Reference: "Psalms 46:1",
      Text: "God is our refuge and strength, a very present help in trouble."
  }, {
      Id: 435,
      Name: "Wisdom",
      Reference: "James 1:5",
      Text: "But if any of you lacks wisdom, let him ask of God, who gives to all liberally and without reproach, and it will be given to him."
  }, {
      Id: 436,
      Name: "Wisdom",
      Reference: "Psalms 119:73",
      Text: "Your hands have made me and formed me. Give me understanding, that I may learn your commandments."
  }, {
      Id: 437,
      Name: "Wisdom",
      Reference: "Luke 15:7",
      Text: "I tell you that even so there will be more joy in heaven over one sinner who repents, than over ninety-nine righteous people who need no repentance."
  }, {
      Id: 438,
      Name: "Wisdom",
      Reference: "Proverbs 3:5",
      Text: "Trust in Yahweh with all your heart, and don’t lean on your own understanding."
  }, {
      Id: 439,
      Name: "Wisdom",
      Reference: "Job 13:15",
      Text: "Behold, he will kill me. I have no hope. Nevertheless, I will maintain my ways before him."
  }, {
      Id: 440,
      Name: "Wisdom",
      Reference: "1 Corinthians 13:12",
      Text: "For now we see in a mirror, dimly, but then face to face. Now I know in part, but then I will know fully, even as I was also fully known."
  }, {
      Id: 441,
      Name: "Wisdom",
      Reference: "Isaiah 41:29",
      Text: "Behold, all of their deeds are vanity and nothing. Their molten images are wind and confusion."
  }, {
      Id: 442,
      Name: "Wisdom",
      Reference: "Psalms 70:2",
      Text: "Let them be disappointed and confounded who seek my soul.Let those who desire my ruin be turned back in disgrace."
  }, {
      Id: 443,
      Name: "Wisdom",
      Reference: "1 John 1:9",
      Text: "If we confess our sins, he is faithful and righteous to forgive us the sins and to cleanse us from all unrighteousness."
  }, {
      Id: 444,
      Name: "Wisdom",
      Reference: "1 Peter 4:7",
      Text: "But the end of all things is near. Therefore be of sound mind, self-controlled, and sober in prayer."
  }, {
      Id: 445,
      Name: "Wisdom",
      Reference: "Acts 2:38",
      Text: "Peter said to them, “Repent and be baptized, every one of you, in the name of Jesus Christ for the forgiveness of sins, and you will receive the gift of the Holy Spirit."
  }, {
      Id: 446,
      Name: "Wisdom",
      Reference: "Matthew 7:21-23",
      Text: "“Not everyone who says to me, ‘Lord, Lord,’ will enter into the Kingdom of Heaven, but he who does the will of my Father who is in heaven. Many will tell me in that day, ‘Lord, Lord, didn’t we prophesy in your name, in your name cast out demons, and in your name do many mighty works?’ Then I will tell them, ‘ I never knew you. Depart from me, you who work iniquity.’"
  }, {
      Id: 447,
      Name: "Wisdom",
      Reference: "Psalms 35:26",
      Text: "Let them be disappointed and confounded together who rejoice at my calamity. Let them be clothed with shame and dishonor who magnify themselves against me."
  }, {
      Id: 448,
      Name: "Wisdom",
      Reference: "Isaiah 54:17",
      Text: "No weapon that is formed against you will prevail; and you will condemn every tongue that rises against you in judgment. This is the heritage of Yahweh’s servants, and their righteousness is of me,” says Yahweh."
  }, {
      Id: 449,
      Name: "Wisdom",
      Reference: "Psalms 35:4",
      Text: "Let those who seek after my soul be disappointed and brought to dishonor. Let those who plot my ruin be turned back and confounded."
  }, {
      Id: 450,
      Name: "Wisdom",
      Reference: "James 4:7",
      Text: "Be subject therefore to God. Resist the devil, and he will flee from you."
  }, {
      Id: 451,
      Name: "Wisdom",
      Reference: "Romans 13:4",
      Text: "for he is a servant of God to you for good. But if you do that which is evil, be afraid, for he doesn’t bear the sword in vain; for he is a servant of God, an avenger for wrath to him who does evil."
  }, {
      Id: 452,
      Name: "Wisdom",
      Reference: "Acts 19:29",
      Text: "The whole city was filled with confusion, and they rushed with one accord into the theater, having seized Gaius and Aristarchus, men of Macedonia, Paul’s companions in travel."
  }, {
      Id: 453,
      Name: "Wisdom",
      Reference: "Jeremiah 3:25",
      Text: "Let us lie down in our shame, and let our confusion cover us; for we have sinned against Yahweh our God, we and our fathers, from our youth even to this day. We have not obeyed Yahweh our God’s voice.”"
  }, {
      Id: 454,
      Name: "Wisdom",
      Reference: "Psalms 119:32",
      Text: "I run in the path of your commandments, for you have set my heart free."
  }, {
      Id: 455,
      Name: "Wisdom",
      Reference: "Genesis 11:9",
      Text: "Therefore its name was called Babel, because there Yahweh confused the language of all the earth. From there, Yahweh scattered them abroad on the surface of all the earth."
  }, {
      Id: 456,
      Name: "Wisdom",
      Reference: "Genesis 11:9",
      Text: "Therefore its name was called Babel, because there Yahweh confused the language of all the earth. From there, Yahweh scattered them abroad on the surface of all the earth."
  }, {
      Id: 457,
      Name: "Wisdom",
      Reference: "2 Timothy 2:15",
      Text: "Give diligence to present yourself approved by God, a workman who doesn’t need to be ashamed, properly handling the Word of Truth."
  }, {
      Id: 458,
      Name: "Wisdom",
      Reference: "Daniel 9:8",
      Text: "Lord, to us belongs confusion of face, to our kings, to our princes, and to our fathers, because we have sinned against you."
  }, {
      Id: 459,
      Name: "Wisdom",
      Reference: "Psalms 71:24",
      Text: "My tongue will also talk about your righteousness all day long, for they are disappointed, and they are confounded, who want to harm me."
  }, {
      Id: 460,
      Name: "Wisdom",
      Reference: "Galatians 1:8-9",
      Text: "But even though we, or an angel from heaven, should preach to you any “good news” other than that which we preached to you, let him be cursed. As we have said before, so I now say again: if any man preaches to you any “good news” other than that which you received, let him be cursed."
  }, {
      Id: 461,
      Name: "Wisdom",
      Reference: "1 Corinthians 1:1-31",
      Text: "Because of him, you are in Christ Jesus, who was made to us wisdom from God, and righteousness and sanctification, and redemption,"
  }, {
      Id: 462,
      Name: "Wisdom",
      Reference: "Jeremiah 7:19",
      Text: "Do they provoke me to anger?” says Yahweh. “Don’t they provoke themselves, to the confusion of their own faces?”"
  }, {
      Id: 463,
      Name: "Wisdom",
      Reference: "Psalms 32:8",
      Text: "I will instruct you and teach you in the way which you shall go. I will counsel you with my eye on you."
  }, {
      Id: 464,
      Name: "Wisdom",
      Reference: "Leviticus 20:12",
      Text: "If a man lies with his daughter-in-law, both of them shall surely be put to death. They have committed a perversion. Their blood shall be upon themselves."
  }, {
      Id: 465,
      Name: "Wisdom",
      Reference: "Matthew 4:7",
      Text: "Jesus said to him,“Again, it is written, ‘ You shall not test the Lord, your God.’”"
  },  {
      Id: 467,
      Name: "Wisdom",
      Reference: "Matthew 26:52-54",
      Text: "Then Jesus said to him, “Put your sword back into its place, for all those who take the sword will die by the sword. Or do you think that I couldn’t ask my Father, and he would even now send me more than twelve legions of angels? How then would the Scriptures be fulfilled that it must be so?”"
  }, {
      Id: 468,
      Name: "Wisdom",
      Reference: "Psalms 119:165",
      Text: "Those who love your law have great peace. Nothing causes them to stumble."
  }, {
      Id: 469,
      Name: "Wisdom",
      Reference: "Leviticus 18:23",
      Text: "You shall not lie with any animal to defile yourself with it. No woman may give herself to an animal, to lie down with it: it is a perversion."
  }, {
      Id: 470,
      Name: "Wisdom",
      Reference: "Matthew 5:38-39",
      Text: "You have heard that it was said, ‘An eye for an eye, and a tooth for a tooth.’ But I tell you, don’t resist him who is evil; but whoever strikes you on your right cheek, turn to him the other also."
  }, {
      Id: 471,
      Name: "Wisdom",
      Reference: "Psalms 144:1",
      Text: "Blessed be Yahweh, my rock, who trains my hands to war, and my fingers to battle—"
  }, {
      Id: 472,
      Name: "Wisdom",
      Reference: "Ezra 9:7",
      Text: "Since the days of our fathers we have been exceedingly guilty to this day; and for our iniquities we, our kings, and our priests have been delivered into the hand of the kings of the lands, to the sword, to captivity, to plunder, and to confusion of face, as it is this day."
  }, {
      Id: 473,
      Name: "Wisdom",
      Reference: "2 Corinthians 4:4",
      Text: "in whom the god of this world has blinded the minds of the unbelieving, that the light of the Good News of the glory of Christ, who is the image of God, should not dawn on them."
  }, {
      Id: 474,
      Name: "Wisdom",
      Reference: "Isaiah 41:11",
      Text: "Behold, all those who are incensed against you will be disappointed and confounded. Those who strive with you will be like nothing, and shall perish."
  }, {
      Id: 475,
      Name: "Wisdom",
      Reference: "Exodus 20:3",
      Text: "“You shall have no other gods before me."
  }, {
      Id: 476,
      Name: "Wisdom",
      Reference: "2 Corinthians 12:20",
      Text: "For I am afraid that perhaps when I come, I might find you not the way I want to, and that I might be found by you as you don’t desire, that perhaps there would be strife, jealousy, outbursts of anger, factions, slander, whisperings, proud thoughts, or riots,"
  }, {
      Id: 477,
      Name: "Wisdom",
      Reference: "Psalms 119:127",
      Text: "Therefore I love your commandments more than gold, yes, more than pure gold."
  }, {
      Id: 478,
      Name: "Wisdom",
      Reference: "Matthew 5:19",
      Text: "Therefore, whoever shall break one of these least commandments and teach others to do so, shall be called least in the Kingdom of Heaven; but whoever shall do and teach them shall be called great in the Kingdom of Heaven."
  }, {
      Id: 479,
      Name: "Wisdom",
      Reference: "Isaiah 61:7",
      Text: "Instead of your shame you will have double. Instead of dishonor, they will rejoice in their portion. Therefore in their land they will possess double. Everlasting joy will be to them."
  }, {
      Id: 480,
      Name: "Wisdom",
      Reference: "Judges 5:8",
      Text: "They chose new gods. Then war was in the gates. Was there a shield or spear seen among forty thousand in Israel?"
  }, {
      Id: 481,
      Name: "Wisdom",
      Reference: "Isaiah 34:11",
      Text: "But the pelican and the porcupine will possess it. The owl and the raven will dwell in it. He will stretch the line of confusion over it, and the plumb line of emptiness."
  }, {
      Id: 482,
      Name: "Wisdom",
      Reference: "Psalms 28:7",
      Text: "Yahweh is my strength and my shield. My heart has trusted in him, and I am helped. Therefore my heart greatly rejoices. With my song I will thank him."
  }, {
      Id: 483,
      Name: "Wisdom",
      Reference: "Jeremiah 20:11",
      Text: "But Yahweh is with me as an awesome mighty one. Therefore my persecutors will stumble, and they won’t prevail. They will be utterly disappointed because they have not dealt wisely, even with an everlasting dishonor which will never be forgotten."
  }, {
      Id: 484,
      Name: "Wisdom",
      Reference: "Isaiah 24:10",
      Text: "The confused city is broken down. Every house is shut up, that no man may come in."
  }, {
      Id: 485,
      Name: "Wisdom",
      Reference: "Psalms 69:6",
      Text: "Don’t let those who wait for you be shamed through me, Lord Yahweh of Armies. Don’t let those who seek you be brought to dishonor through me, God of Israel."
  }, {
      Id: 486,
      Name: "Wisdom",
      Reference: "Ephesians 2:8",
      Text: "for by grace you have been saved through faith, and that not of yourselves; it is the gift of God,"
  }, {
      Id: 487,
      Name: "Wisdom",
      Reference: "Acts 17:10-11",
      Text: "The brothers immediately sent Paul and Silas away by night to Beroea. When they arrived, they went into the Jewish synagogue. Now these were more noble than those in Thessalonica, in that they received the word with all readiness of mind, examining the Scriptures daily to see whether these things were so."
  }, {
      Id: 488,
      Name: "Wisdom",
      Reference: "Daniel 9:7",
      Text: "“Lord, righteousness belongs to you, but to us confusion of face, as it is today; to the men of Judah, and to the inhabitants of Jerusalem, and to all Israel, who are near and who are far off, through all the countries where you have driven them, because of their trespass that they have trespassed against you."
  }, {
      Id: 489,
      Name: "Wisdom",
      Reference: "Revelation 1:1",
      Text: "This is the Revelation of Jesus Christ, which God gave him to show to his servants the things which must happen soon, which he sent and made known by his angel to his servant, John,"
  }, {
      Id: 490,
      Name: "Wisdom",
      Reference: "Luke 1:37",
      Text: "For nothing spoken by God is impossible.”"
      },
  
      {
          Id: 500,
          Name: "Healing",
          Reference: "Matthew 4:23",
          Text: "Jesus went about in all Galilee, teaching in their synagogues, preaching the Good News of the Kingdom, and healing every disease and every sickness among the people. ",
          Lie: "There are some diseases Jesus just will not heal."
      },
      {
      Id: 511,
      Name: "Healing",
      Reference: "Psalms 103:2-3",
      Text: "Praise Yahweh, my soul, and don’t forget all his benefits, who forgives all your sins, who heals all your diseases,",
    Lie: "God won't heal all your diseases."
  }, {
      Id: 528,
      Name: "Healing",
      Reference: "Hebrews 13:8",
      Text: "Jesus Christ is the same yesterday, today, and forever.",
    Lie: "The age of miracles is past. Jesus is not the same any more."
  }, {
      Id: 529,
      Name: "Healing",
      Reference: "Acts 10:38",
      Text: "how God anointed Jesus of Nazareth with the Holy Spirit and with power, who went about doing good and healing all who were oppressed by the devil, for God was with him.",
    Lie: "Sickness is of God, healing might be of the devil."
  }, 
  
  {
      Id: 492,
      Name: "Healing",
      Reference: "James 5:15",
      Text: "and the prayer of faith will heal him who is sick, and the Lord will raise him up. If he has committed sins, he will be forgiven.",
    Lie: "You can pray with faith and still nothing will happen"
  }, {
      Id: 515,
      Name: "Healing",
      Reference: "Psalms 107:20",
      Text: "He sends his word, and heals them, and delivers them from their graves.",
    Lie: "There is no healing power in God's word."
  }, {
      Id: 493,
      Name: "Healing",
      Reference: "1 Peter 2:24",
      Text: "He himself bore our sins in his body on the tree, that we, having died to sins, might live to righteousness. You were healed by his wounds.",
    Lie: "Jesus' death on the cross achieved nothing as far as healing is concerned."
  }, {
      Id: 494,
      Name: "Healing",
      Reference: "Isaiah 41:10",
      Text: "Don’t you be afraid, for I am with you. Don’t be dismayed, for I am your God. I will strengthen you. Yes, I will help you. Yes, I will uphold you with the right hand of my righteousness.",
    Lie: "When it gets down to it, God won't help you. Things will go from bad to worse."
  }, {
      Id: 497,
      Name: "Healing",
      Reference: "Isaiah 53:5",
      Text: "But he was pierced for our transgressions. He was crushed for our iniquities. The punishment that brought our peace was on him, and by his wounds we are healed.",
    Lie: "Healing is very uncertain. God may not want to do it."
  }, {
      Id: 498,
      Name: "Healing",
      Reference: "Psalms 41:3",
      Text: "Yahweh will sustain him on his sickbed, and restore him from his bed of illness.",
    Lie: "When you are sick in bed, God has abandoned you."
  }, {
      Id: 499,
      Name: "Healing",
      Reference: "Psalms 147:3",
      Text: "He heals the broken in heart, and binds up their wounds.",
    Lie: "God can't heal a broken heart."
  }, {
      Id: 500,
      Name: "Healing",
      Reference: "Mark 16:18",
      Text: "Those who believe - they shall lay hands on the sick and they shall recover.",
    Lie: "Don't expect that people will recover when you lay hands on them in Jesus' name."
  }, {
      Id: 501,
      Name: "Healing",
      Reference: "3 John 1:2",
      Text: "Beloved, I pray that you may prosper in all things and be healthy, even as your soul prospers.",
    Lie: "God isn't interested in your health or well-being."
  }, {
      Id: 502,
      Name: "Healing",
      Reference: "James 5:16",
      Text: "Confess your sins to one another and pray for one another, that you may be healed. The insistent prayer of a righteous person is powerfully effective.",
    Lie: "You can hide your sins and it won't stop your healing."
  }, 
  {
      Id: 503,
      Name: "Healing",
      Reference: "Proverbs 4:20-22",
      Text: "My son, attend to my words. Turn your ear to my sayings. Let them not depart from your eyes. Keep them in the center of your heart. For they are life to those who find them, and health to their whole body.",
    Lie: "Focusing too much on the Bible won't bring healing."
  }, 
  
  {
      Id: 504,
      Name: "Healing",
      Reference: "Proverbs 17:22",
      Text: "A cheerful heart makes good medicine, but a crushed spirit dries up the bones."
  }, {
      Id: 505,
      Name: "Healing",
      Reference: "Jeremiah 30:17a",
      Text: "For I will restore health to you, and I will heal you of your wounds,” says Yahweh"
  }, {
      Id: 506,
      Name: "Healing",
      Reference: "Matthew 10:1",
      Text: "He called to himself his twelve disciples, and gave them authority over unclean spirits, to cast them out, and to heal every disease and every sickness."
  }, {
      Id: 507,
      Name: "Healing",
      Reference: "James 5:14",
      Text: "Is any among you sick? Let him call for the elders of the assembly, and let them pray over him, anointing him with oil in the name of the Lord;",
    Lie: "If you are sick, don't bother the elders. They are just businessmen and too busy anyway."
  }, {
      Id: 508,
      Name: "Healing",
      Reference: "Exodus 15:26",
      Text: "He said, “If you will diligently listen to Yahweh your God’s voice, and will do that which is right in his eyes, and will pay attention to his commandments, and keep all his statutes, I will put none of the diseases on you which I have put on the Egyptians; for I am Yahweh who heals you.”",
    Lie: "Whether you get healed or not has nothing to do with whether you listen to God and what he says."
  }, {
      Id: 509,
      Name: "Healing",
      Reference: "Matthew 10:8",
      Text: "Heal the sick, cleanse the lepers, and cast out demons. Freely you received, so freely give.",
    Lie: "You can pray for the sick if you like. God doesn't expect any more than that."
  }, 
  {
      Id: 495,
      Name: "Healing",
      Reference: "Jeremiah 17:14",
      Text: "Heal me, O Yahweh, and I will be healed. Save me, and I will be saved; for you are my praise.",
      Lie: "It is wrong to cry out to God for healing."
  }, {
      Id: 496,
      Name: "Healing",
      Reference: "Jeremiah 33:6",
      Text: "behold, I will bring it health and healing, and I will cure them; and I will reveal to them abundance of peace and truth.",
    Lie: "When it gets down to it, God won't deliver health, healing or real peace."
  }, {
      Id: 512,
      Name: "Healing",
      Reference: "Deuteronomy 7:15",
      Text: "Yahweh will take away from you all sickness; and he will put none of the evil diseases of Egypt, which you know, on you, but will lay them on all those who hate you.",
    Lie: "There are some sicknesses God just won't help with."
  }, {
      Id: 513,
      Name: "Healing",
      Reference: "Philippians 4:19",
      Text: "My God will supply every need of yours according to his riches in glory in Christ Jesus.",
    Lie: "God won't supply your needs."
  }, {
      Id: 514,
      Name: "Healing",
      Reference: "Philippians 4:6-7",
      Text: "In nothing be anxious, but in everything, by prayer and petition with thanksgiving, let your requests be made known to God. And the peace of God, which surpasses all understanding, will guard your hearts and your thoughts in Christ Jesus.",
    Lie: "If things are not going well, you had better start worrying."
  }, {
      Id: 516,
      Name: "Healing",
      Reference: "Proverbs 3:7-8",
      Text: "Don’t be wise in your own eyes. Fear Yahweh, and depart from evil. It will be health to your body, and nourishment to your bones.",
    Lie: "God doesn't promise health to those who fear him and depart from evil."
  }, {
      Id: 517,
      Name: "Healing",
      Reference: "Luke 4:18",
      Text: "“The Spirit of the Lord is on me, because he has anointed me to preach good news to the poor. He has sent me to heal the broken hearted, to proclaim release to the captives,  recovering of sight to the blind, to deliver those who are crushed,",
      Lie: "The LORD doesn't come to heal broken hearts, or set people free."
  }, {
      Id: 518,
      Name: "Healing",
      Reference: "Acts 4:30",
      Text: "while you stretch out your hand to heal",
    Lie: "There is no point asking God to heal people."
  }, {
      Id: 519,
      Name: "Healing",
      Reference: "2 Chronicles 7:14",
      Text: "if my people who are called by my name will humble themselves, pray, seek my face, and turn from their wicked ways, then I will hear from heaven, will forgive their sin, and will heal their land.",
    Lie: "National healing is impossible."
  }, {
      Id: 520,
      Name: "Healing",
      Reference: "Hebrews 11:6",
      Text: "Without faith it is impossible to be well pleasing to him, for he who comes to God must believe that he exists, and that he is a rewarder of those who seek him.",
    Lie: "You can please God without faith as long as you try to do good."
  }, {
      Id: 521,
      Name: "Healing",
      Reference: "James 5:14-15",
      Text: "Is any among you sick? Let him call for the elders of the assembly, and let them pray over him, anointing him with oil in the name of the Lord; and the prayer of faith will heal him who is sick, and the Lord will raise him up. If he has committed sins, he will be forgiven.",
     Lie: "Elders can pray for the sick if they like, but probably nothing will happen."
  }, {
      Id: 522,
      Name: "Healing",
      Reference: "Psalms 30:2",
      Text: "Yahweh my God, I cried to you, and you have healed me."
  }, {
      Id: 523,
      Name: "Healing",
      Reference: "Proverbs 16:24",
      Text: "Pleasant words are a honeycomb, sweet to the soul, and health to the bones.",
    Lie: "Words can't heal."
  }, {
      Id: 524,
      Name: "Healing",
      Reference: "Luke 10:9",
      Text: "Heal the sick who are there and tell them, ‘God’s Kingdom has come near to you.’",
    Lie: "God does not expect us to heal people, just pray for them and hope for the best."
  }, {
      Id: 525,
      Name: "Healing",
      Reference: "Matthew 9:35",
      Text: "Jesus went about all the cities and the villages, teaching in their synagogues and preaching the Good News of the Kingdom, and healing every disease and every sickness among the people.",
    Lie: "Healing was not really an important part of Jesus' ministry."
  }, {
      Id: 527,
      Name: "Healing",
      Reference: "Isaiah 54:17",
      Text: "No weapon that is formed against you will prevail; and you will condemn every tongue that rises against you in judgment. This is the heritage of Yahweh’s servants, and their righteousness is of me,” says Yahweh.",
    Lie: "If your enemies have a weapon against you, you are in trouble."
  }, {
      Id: 530,
      Name: "Healing",
      Reference: "Psalms 41:4",
      Text: "I said, “Yahweh, have mercy on me! Heal me, for I have sinned against you.”",
    Lie: "There is no relationship between sin and sickness"
  }, {
      Id: 531,
      Name: "Healing",
      Reference: "Isaiah 57:18-19",
      Text: "I have seen his ways, and will heal him. I will lead him also, and restore comforts to him and to his mourners. I create the fruit of the lips: Peace, peace, to him who is far off and to him who is near,” says Yahweh; “and I will heal them.”",
    Lie: "God never backs up what we say and generally doesn't heal."
  }, {
      Id: 532,
      Name: "Healing",
      Reference: "Exodus 23:25",
      Text: "You shall serve Yahweh your God, and he will bless your bread and your water, and I will take sickness away from among you.",
    Lie: "It is normal for sickness to be among the people of God."
  }, {
      Id: 533,
      Name: "Healing",
      Reference: "John 10:10",
      Text: "The thief only comes to steal, kill, and destroy. I came that they may have life, and may have it abundantly."
  }, {
      Id: 534,
      Name: "Healing",
      Reference: "Romans 5:3-4",
      Text: "Not only this, but we also rejoice in our sufferings, knowing that suffering produces perseverance; and perseverance, proven character; and proven character, hope;"
  }, {
      Id: 535,
      Name: "Healing",
      Reference: "Matthew 11:28",
      Text: "“Come to me, all you who labor and are heavily burdened, and I will give you rest."
  }, {
      Id: 536,
      Name: "Healing",
      Reference: "Mark 5:34",
      Text: "He said to her,“Daughter, your faith has made you well. Go in peace, and be cured of your disease.”"
  }, {
      Id: 537,
      Name: "Healing",
      Reference: "James 4:7",
      Text: "Be subject therefore to God. Resist the devil, and he will flee from you."
  }, {
      Id: 538,
      Name: "Healing",
      Reference: "John 14:27",
      Text: "Peace I leave with you. My peace I give to you; not as the world gives, I give to you. Don’t let your heart be troubled, neither let it be fearful."
  }, {
      Id: 539,
      Name: "Healing",
      Reference: "Malachi 4:2",
      Text: "But to you who fear my name shall the sun of righteousness arise with healing in its wings. You will go out and leap like calves of the stall."
  }, {
      Id: 540,
      Name: "Healing",
      Reference: "2 Corinthians 12:9",
      Text: "He has said to me,“My grace is sufficient for you, for my power is made perfect in weakness.” Most gladly therefore I will rather glory in my weaknesses, that the power of Christ may rest on me."
  }, {
      Id: 541,
      Name: "Healing",
      Reference: "Deuteronomy 32:39",
      Text: "“See now that I myself am he. There is no god with me. I kill and I make alive. I wound and I heal. There is no one who can deliver out of my hand."
  }, {
      Id: 542,
      Name: "Healing",
      Reference: "Psalms 103:2-5",
      Text: "Praise Yahweh, my soul, and don’t forget all his benefits, who forgives all your sins, who heals all your diseases, who redeems your life from destruction,who crowns you with loving kindness and tender mercies, who satisfies your desire with good things,so that your youth is renewed like the eagle’s."
  }, {
      Id: 543,
      Name: "Healing",
      Reference: "Isaiah 57:18",
      Text: "I have seen his ways, and will heal him. I will lead him also, and restore comforts to him and to his mourners."
  }, {
      Id: 544,
      Name: "Healing",
      Reference: "2 Corinthians 5:7",
      Text: "for we walk by faith, not by sight."
  }, {
      Id: 545,
      Name: "Healing",
      Reference: "Hebrews 11:1",
      Text: "Now faith is assurance of things hoped for, proof of things not seen."
  }, {
      Id: 546,
      Name: "Healing",
      Reference: "Isaiah 53:4-5",
      Text: "Surely he has borne our sickness and carried our suffering; yet we considered him plagued, struck by God, and afflicted. But he was pierced for our transgressions. He was crushed for our iniquities. The punishment that brought our peace was on him; and by his wounds we are healed.",
      Lie: "The sufferings of Jesus have nothing to do with physical healing for you." 
    }, {
      Id: 547,
      Name: "Healing",
      Reference: "Psalms 103:1-3",
      Text: "Praise Yahweh, my soul! All that is within me, praise his holy name! Praise Yahweh, my soul, and don’t forget all his benefits, who forgives all your sins, who heals all your diseases,",
      Lie: "Healing is NOT one of the benefits that the LORD makes available."
    }, {
      Id: 548,
      Name: "Healing",
      Reference: "Luke 5:17",
      Text: "On one of those days, he was teaching; and there were Pharisees and teachers of the law sitting by who had come out of every village of Galilee, Judea, and Jerusalem. The power of the Lord was with him to heal them.",
    Lie: "If God wants to heal people, He will just do it."
  }, {
      Id: 549,
      Name: "Healing",
      Reference: "Luke 13:12",
      Text: "When Jesus saw her, he called her and said to her,“Woman, you are freed from your infirmity.”"
  }, {
      Id: 550,
      Name: "Healing",
      Reference: "Psalms 119:50",
      Text: "This is my comfort in my affliction, for your word has revived me."
  }, {
      Id: 551,
      Name: "Healing",
      Reference: "Isaiah 58:8",
      Text: "Then your light will break out as the morning, and your healing will appear quickly; then your righteousness shall go before you, and Yahweh’s glory will be your rear guard."
  }, {
      Id: 552,
      Name: "Healing",
      Reference: "Luke 8:48",
      Text: "He said to her,“Daughter, cheer up. Your faith has made you well. Go in peace.”"
  }, {
      Id: 553,
      Name: "Healing",
      Reference: "Luke 9:11",
      Text: "But the multitudes, perceiving it, followed him. He welcomed them, spoke to them of God’s Kingdom, and he cured those who needed healing."
  }, {
      Id: 554,
      Name: "Healing",
      Reference: "Numbers 12:13",
      Text: "Moses cried to Yahweh, saying, “Heal her, God, I beg you!”"
  }, {
      Id: 555,
      Name: "Healing",
      Reference: "Matthew 14:14",
      Text: "Jesus went out, and he saw a great multitude. He had compassion on them and healed their sick."
  }, {
      Id: 556,
      Name: "Healing",
      Reference: "1 Samuel 12:16",
      Text: "“Now therefore stand still and see this great thing, which Yahweh will do before your eyes."
  }, {
      Id: 557,
      Name: "Healing",
      Reference: "2 Kings 20:5",
      Text: "Turn back, and tell Hezekiah the prince of my people, ‘Yahweh, the God of David your father, says, “I have heard your prayer. I have seen your tears. Behold, I will heal you. On the third day, you will go up to Yahweh’s house."
  }, {
      Id: 558,
      Name: "Healing",
      Reference: "Luke 8:50",
      Text: "But Jesus hearing it, answered him,“Don’t be afraid. Only believe, and she will be healed.”"
  }, {
      Id: 559,
      Name: "Healing",
      Reference: "Matthew 17:20",
      Text: "He said to them, “Because of your unbelief. For most certainly I tell you, if you have faith as a grain of mustard seed, you will tell this mountain, ‘Move from here to there,’ and it will move; and nothing will be impossible for you."
  }, {
      Id: 560,
      Name: "Healing",
      Reference: "Revelation 21:4",
      Text: "He will wipe away every tear from their eyes. Death will be no more; neither will there be mourning, nor crying, nor pain any more. The first things have passed away."
  }, {
      Id: 561,
      Name: "Healing",
      Reference: "Isaiah 53:4-5",
      Text: "Surely he has borne our sickness and carried our suffering; yet we considered him plagued, struck by God, and afflicted. But he was pierced for our transgressions. He was crushed for our iniquities. The punishment that brought our peace was on him; and by his wounds we are healed. "
  }, {
      Id: 562,
      Name: "Healing",
      Reference: "1 Peter 2:21-24",
      Text: "He himself bore our sins in his body on the tree, that we, having died to sins, might live to righteousness. You were healed by his wounds."
  }, {
      Id: 563,
      Name: "Healing",
      Reference: "Acts 9:34",
      Text: "Peter said to him, “Aeneas, Jesus Christ heals you. Get up and make your bed!” Immediately he arose."
  }, {
      Id: 564,
      Name: "Healing",
      Reference: "Matthew 12:13",
      Text: "Then he told the man,“Stretch out your hand.” He stretched it out; and it was restored whole, just like the other."
  }, {
      Id: 565,
      Name: "Healing",
      Reference: "Psalms 41:1-3",
      Text: "Blessed is he who considers the poor.Yahweh will deliver him in the day of evil. Yahweh will preserve him, and keep him alive. He shall be blessed on the earth, and he will not surrender him to the will of his enemies. Yahweh will sustain him on his sickbed, and restore him from his bed of illness."
  }, {
      Id: 566,
      Name: "Healing",
      Reference: "Romans 12:1-2",
      Text: "Therefore I urge you, brothers, by the mercies of God, to present your bodies a living sacrifice, holy, acceptable to God, which is your spiritual service. Don’t be conformed to this world, but be transformed by the renewing of your mind, so that you may prove what is the good, well-pleasing, and perfect will of God."
  }, {
      Id: 567,
      Name: "Healing",
      Reference: "Luke 6:19",
      Text: "All the multitude sought to touch him, for power came out of him and healed them all."
  }, {
      Id: 568,
      Name: "Healing",
      Reference: "Hosea 14:4",
      Text: "“I will heal their waywardness. I will love them freely"
  }, {
      Id: 569,
      Name: "Healing",
      Reference: "Proverbs 3:7-8",
      Text: "Don’t be wise in your own eyes. Fear Yahweh, and depart from evil. It will be health to your body, and nourishment to your bones."
  }, {
      Id: 570,
      Name: "Healing",
      Reference: "1 Corinthians 12:9",
      Text: "to another faith by the same Spirit, and to another gifts of healings by the same Spirit,"
  }, {
      Id: 571,
      Name: "Healing",
      Reference: "Psalms 107:19-20",
      Text: "Then they cry to Yahweh in their trouble, and he saves them out of their distresses. He sends his word, and heals them, and delivers them from their graves."
  }, {
      Id: 572,
      Name: "Healing",
      Reference: "Isaiah 57:19",
      Text: "I create the fruit of the lips: Peace, peace, to him who is far off and to him who is near,” says Yahweh; “and I will heal them.”"
  },  {
      Id: 574,
      Name: "Healing",
      Reference: "Matthew 13:15",
      Text: "for this people’s heart has grown callous, their ears are dull of hearing, and they have closed their eyes; or else perhaps they might perceive with their eyes, hear with their ears, understand with their heart, and would turn again, and I would heal them.’"
  }, {
      Id: 575,
      Name: "Healing",
      Reference: "Mark 10:52",
      Text: "Jesus said to him, “Go your way. Your faith has made you well.” Immediately he received his sight and followed Jesus on the way."
  }, {
      Id: 576,
      Name: "Healing",
      Reference: "Isaiah 19:22",
      Text: "Yahweh will strike Egypt, striking and healing. They will return to Yahweh, and he will be entreated by them, and will heal them."
  }, {
      Id: 577,
      Name: "Healing",
      Reference: "Job 5:17-18",
      Text: "“Behold, happy is the man whom God corrects.Therefore do not despise the chastening of the Almighty. For he wounds and binds up. He injures and his hands make whole."
  }, {
      Id: 578,
      Name: "Healing",
      Reference: "Luke 13:13",
      Text: "He laid his hands on her, and immediately she stood up straight and glorified God."
  }, {
      Id: 579,
      Name: "Healing",
      Reference: "2 Corinthians 1:3",
      Text: "Blessed be the God and Father of our Lord Jesus Christ, the Father of mercies and God of all comfort,"
  }, {
      Id: 580,
      Name: "Healing",
      Reference: "Psalms 34:6",
      Text: "This poor man cried, and Yahweh heard him, and saved him out of all his troubles."
  }, {
      Id: 581,
      Name: "Healing",
      Reference: "Romans 12:2",
      Text: "Don’t be conformed to this world, but be transformed by the renewing of your mind, so that you may prove what is the good, well-pleasing, and perfect will of God."
  }, {
      Id: 582,
      Name: "Healing",
      Reference: "Isaiah 55:10-11",
      Text: "For as the rain comes down and the snow from the sky, and doesn’t return there, but waters the earth, and makes it grow and bud, and gives seed to the sower and bread to the eater; so is my word that goes out of my mouth: it will not return to me void, but it will accomplish that which I please, and it will prosper in the thing I sent it to do."
  }, {
      Id: 583,
      Name: "Healing",
      Reference: "Ecclesiastes 3:1-3",
      Text: "For everything there is a season, and a time for every purpose under heaven: a time to be born, and a time to die; a time to plant, and a time to pluck up that which is planted; a time to kill, and a time to heal; a time to break down, and a time to build up;"
  }, {
      Id: 584,
      Name: "Healing",
      Reference: "Psalms 31:9",
      Text: "Have mercy on me, Yahweh, for I am in distress. My eye, my soul, and my body waste away with grief."
  }, {
      Id: 585,
      Name: "Healing",
      Reference: "Acts 28:27",
      Text: "For this people’s heart has grown callous. Their ears are dull of hearing. Their eyes they have closed.Lest they should see with their eyes, hear with their ears, understand with their heart, and would turn again, then I would heal them.’"
  }, {
      Id: 586,
      Name: "Healing",
      Reference: "John 12:40",
      Text: "“He has blinded their eyes and he hardened their heart, lest they should see with their eyes, and perceive with their heart, and would turn, and I would heal them.”"
  }, {
      Id: 587,
      Name: "Healing",
      Reference: "James 5:11",
      Text: "Behold, we call them blessed who endured. You have heard of the perseverance of Job and have seen the Lord in the outcome, and how the Lord is full of compassion and mercy."
  }, {
      Id: 588,
      Name: "Healing",
      Reference: "Numbers 6:25-27",
      Text: "Yahweh make his face to shine on you, and be gracious to you. Yahweh lift up his face toward you, and give you peace.’ “So they shall put my name on the children of Israel; and I will bless them.”"
  }, {
      Id: 589,
      Name: "Healing",
      Reference: "Psalms 34:20",
      Text: "He protects all of his bones.Not one of them is broken."
  }, {
      Id: 590,
      Name: "Healing",
      Reference: "Psalms 119:107",
      Text: "I am afflicted very much. Revive me, Yahweh, according to your word."
  }, {
      Id: 591,
      Name: "Healing",
      Reference: "Psalms 119:71",
      Text: "It is good for me that I have been afflicted, that I may learn your statutes."
  }, {
      Id: 592,
      Name: "Joy",
      Reference: "Romans 15:13",
      Text: "Now may the God of hope fill you with all joy and peace in believing, that you may abound in hope in the power of the Holy Spirit.",
    Lie: "You will be miserable. There is no way that joy is in God's plan for your life."
  }, {
      Id: 593,
      Name: "Joy",
      Reference: "Romans 12:12",
      Text: "rejoicing in hope, enduring in troubles, continuing steadfastly in prayer,",
    Lie: "You have too many troubles to rejoice."
  }, {
      Id: 594,
      Name: "Joy",
      Reference: "Philippians 4:4",
      Text: "Rejoice in the Lord always! Again I will say, “Rejoice!”",
    Lie: "Most of the time you will be sad."
  }, {
      Id: 595,
      Name: "Joy",
      Reference: "James 1:2",
      Text: "Count it all joy, my brothers, when you fall into various temptations,",
    Lie: "There is no reason to rejoice when things go bad."
  }, {
      Id: 596,
      Name: "Joy",
      Reference: "Galatians 5:22",
      Text: "But the fruit of the Spirit is love, joy, peace, patience, kindness, goodness, faith,",
    Lie: "Very spiritual people are joyless."
  }, {
      Id: 597,
      Name: "Joy",
      Reference: "Psalms 16:11",
      Text: "You will show me the path of life. In your presence is fullness of joy. In your right hand there are pleasures forever more.",
    Lie: "Being with God is miserable."
  }, {
      Id: 598,
      Name: "Joy",
      Reference: "John 16:24",
      Text: "Until now, you have asked nothing in my name. Ask, and you will receive, that your joy may be made full.",
    Lie: "God loves to turn you down when you ask for things in prayer."
  }, {
      Id: 599,
      Name: "Joy",
      Reference: "Proverbs 17:22",
      Text: "A cheerful heart makes good medicine, but a crushed spirit dries up the bones.",
    Lie: "Being cheeerful is for idiots."
  }, {
      Id: 600,
      Name: "Joy",
      Reference: "John 16:22",
      Text: "Therefore you now have sorrow, but I will see you again, and your heart will rejoice, and no one will take your joy away from you.",
    Lie: "We can take away your joy."
  }, {
      Id: 601,
      Name: "Joy",
      Reference: "Romans 14:17",
      Text: "for God’s Kingdom is not eating and drinking, but righteousness, peace, and joy in the Holy Spirit.",
    Lie: "Joy isn't really THAT important to God."
  }, {
      Id: 602,
      Name: "Joy",
      Reference: "John 15:11",
      Text: "I have spoken these things to you, that my joy may remain in you, and that your joy may be made full.",
    Lie: "Jesus gave commandments to make you miserable."
  }, {
      Id: 603,
      Name: "Joy",
      Reference: "Psalms 30:5",
      Text: "For his anger is but for a moment. His favor is for a lifetime. Weeping may stay for the night, but joy comes in the morning.",
    Lie: "You will never get out of your sadness"
  }, {
      Id: 604,
      Name: "Joy",
      Reference: "Psalms 118:24",
      Text: "This is the day that Yahweh has made. We will rejoice and be glad in it!",
    Lie: "It is going to be a miserable day."
  }, {
      Id: 605,
      Name: "Joy",
      Reference: "1 Peter 1:8",
      Text: "whom, not having known, you love. In him, though now you don’t see him, yet believing, you rejoice greatly with joy that is unspeakable and full of glory,",
    Lie: "Joy is not normal for a follower of the LORD."
  }, {
      Id: 606,
      Name: "Joy",
      Reference: "Nehemiah 8:10",
      Text: "Then he said to them, “Go your way. Eat the fat, drink the sweet, and send portions to him for whom nothing is prepared, for today is holy to our Lord. Don’t be grieved, for the joy of Yahweh is your strength.”",
    Lie: "God is happy when we are sad and miserable."
  }, {
      Id: 607,
      Name: "Joy",
      Reference: "1 Peter 1:8-9",
      Text: "whom, not having known, you love. In him, though now you don’t see him, yet believing, you rejoice greatly with joy that is unspeakable and full of glory, receiving the result of your faith, the salvation of your souls.",
    Lie: "Without actually seeing the LORD it is impossible to rejoice in him."
  }, {
      Id: 608,
      Name: "Joy",
      Reference: "James 1:2-4",
      Text: "Count it all joy, my brothers, when you fall into various temptations, knowing that the testing of your faith produces endurance. Let endurance have its perfect work, that you may be perfect and complete, lacking in nothing.",
    Lie: "When things go bad, you have every right to be miserable."
  }, {
      Id: 609,
      Name: "Joy",
      Reference: "Psalms 4:7",
      Text: "You have put gladness in my heart, more than when their grain and their new wine are increased.",
    Lie: "God doesn't make you glad."
  }, {
      Id: 610,
      Name: "Joy",
      Reference: "Proverbs 10:28",
      Text: "The prospect of the righteous is joy, but the hope of the wicked will perish.",
    Lie: "Wicked people, not righteous people, have something good to look forward to."
  }, {
      Id: 611,
      Name: "Joy",
      Reference: "Galatians 5:22-23",
      Text: "But the fruit of the Spirit is love, joy, peace, patience, kindness, goodness, faith, gentleness, and self-control. Against such things there is no law.",
    Lie: "You have to produce joy yourself."
  }, {
      Id: 612,
      Name: "Joy",
      Reference: "Psalms 71:23",
      Text: "My lips shall shout for joy! My soul, which you have redeemed, sings praises to you!"
  }, {
      Id: 613,
      Name: "Joy",
      Reference: "Psalms 5:11",
      Text: "But let all those who take refuge in you rejoice. Let them always shout for joy, because you defend them.Let them also who love your name be joyful in you."
  }, {
      Id: 614,
      Name: "Joy",
      Reference: "Luke 15:10",
      Text: "Even so, I tell you, there is joy in the presence of the angels of God over one sinner repenting.”"
  }, {
      Id: 615,
      Name: "Joy",
      Reference: "James 1:2-3",
      Text: "Count it all joy, my brothers, when you fall into various temptations, knowing that the testing of your faith produces endurance."
  }, {
      Id: 616,
      Name: "Joy",
      Reference: "Romans 12:15",
      Text: "Rejoice with those who rejoice. Weep with those who weep."
  }, {
      Id: 617,
      Name: "Joy",
      Reference: "Psalms 16:9",
      Text: "Therefore my heart is glad, and my tongue rejoices. My body shall also dwell in safety."
  }, {
      Id: 618,
      Name: "Joy",
      Reference: "Hebrews 12:2",
      Text: "looking to Jesus, the author and perfecter of faith, who for the joy that was set before him endured the cross, despising its shame, and has sat down at the right hand of the throne of God."
  }, {
      Id: 619,
      Name: "Joy",
      Reference: "1 Chronicles 16:27",
      Text: "Honor and majesty are before him. Strength and gladness are in his place."
  }, {
      Id: 620,
      Name: "Joy",
      Reference: "1 Thessalonians 5:16",
      Text: "Always rejoice."
  }, {
      Id: 621,
      Name: "Joy",
      Reference: "Zephaniah 3:17",
      Text: "Yahweh, your God, is among you, a mighty one who will save. He will rejoice over you with joy. He will calm you in his love. He will rejoice over you with singing."
  }, {
      Id: 622,
      Name: "Joy",
      Reference: "Psalms 27:6",
      Text: "Now my head will be lifted up above my enemies around me. I will offer sacrifices of joy in his tent. I will sing, yes, I will sing praises to Yahweh."
  }, {
      Id: 623,
      Name: "Joy",
      Reference: "Psalms 94:19",
      Text: "In the multitude of my thoughts within me, your comforts delight my soul."
  }, {
      Id: 624,
      Name: "Joy",
      Reference: "Ecclesiastes 9:7",
      Text: "Go your way— eat your bread with joy, and drink your wine with a merry heart; for God has already accepted your works."
  }, {
      Id: 625,
      Name: "Joy",
      Reference: "Isaiah 55:12",
      Text: "For you shall go out with joy, and be led out with peace. The mountains and the hills will break out before you into singing; and all the trees of the fields will clap their hands."
  }, {
      Id: 626,
      Name: "Joy",
      Reference: "Psalms 32:11",
      Text: "Be glad in Yahweh, and rejoice, you righteous! Shout for joy, all you who are upright in heart!"
  }, {
      Id: 627,
      Name: "Joy",
      Reference: "Psalms 126:5",
      Text: "Those who sow in tears will reap in joy."
  }, {
      Id: 628,
      Name: "Joy",
      Reference: "Psalms 28:7",
      Text: "Yahweh is my strength and my shield. My heart has trusted in him, and I am helped. Therefore my heart greatly rejoices. With my song I will thank him."
  }, {
      Id: 629,
      Name: "Joy",
      Reference: "Psalms 30:11",
      Text: "You have turned my mourning into dancing for me. You have removed my sackcloth, and clothed me with gladness,"
  }, {
      Id: 630,
      Name: "Joy",
      Reference: "Luke 15:7",
      Text: "I tell you that even so there will be more joy in heaven over one sinner who repents, than over ninety-nine righteous people who need no repentance."
  }, {
      Id: 631,
      Name: "Joy",
      Reference: "2 John 1:12",
      Text: "Having many things to write to you, I don’t want to do so with paper and ink, but I hope to come to you and to speak face to face, that our joy may be made full."
  }, {
      Id: 632,
      Name: "Joy",
      Reference: "Psalms 51:12",
      Text: "Restore to me the joy of your salvation.Uphold me with a willing spirit."
  }, {
      Id: 633,
      Name: "Joy",
      Reference: "Proverbs 15:23",
      Text: "Joy comes to a man with the reply of his mouth. How good is a word at the right time!"
  }, {
      Id: 634,
      Name: "Joy",
      Reference: "Psalms 33:21",
      Text: "For our heart rejoices in him, because we have trusted in his holy name."
  }, {
      Id: 635,
      Name: "Joy",
      Reference: "1 Thessalonians 1:6",
      Text: "You became imitators of us and of the Lord, having received the word in much affliction, with joy of the Holy Spirit,"
  }, {
      Id: 636,
      Name: "Joy",
      Reference: "1 Thessalonians 5:16-18",
      Text: "Always rejoice. Pray without ceasing. In everything give thanks, for this is the will of God in Christ Jesus toward you."
  }, {
      Id: 637,
      Name: "Joy",
      Reference: "1 Peter 4:13",
      Text: "But because you are partakers of Christ’s sufferings, rejoice, that at the revelation of his glory you also may rejoice with exceeding joy."
  }, {
      Id: 638,
      Name: "Joy",
      Reference: "2 Corinthians 7:4",
      Text: "Great is my boldness of speech toward you. Great is my boasting on your behalf. I am filled with comfort. I overflow with joy in all our affliction."
  }, {
      Id: 639,
      Name: "Joy",
      Reference: "Psalms 100:1",
      Text: "Shout for joy to Yahweh, all you lands!"
  }, {
      Id: 640,
      Name: "Joy",
      Reference: "1 John 1:4",
      Text: "And we write these things to you, that our joy may be fulfilled."
  }, {
      Id: 641,
      Name: "Joy",
      Reference: "Psalms 119:111",
      Text: "I have taken your testimonies as a heritage forever, for they are the joy of my heart."
  }, {
      Id: 642,
      Name: "Joy",
      Reference: "Psalms 47:1",
      Text: "Oh clap your hands, all you nations.Shout to God with the voice of triumph!"
  }, {
      Id: 643,
      Name: "Joy",
      Reference: "Isaiah 61:10",
      Text: "I will greatly rejoice in Yahweh! My soul will be joyful in my God, for he has clothed me with the garments of salvation. He has covered me with the robe of righteousness, as a bridegroom decks himself with a garland and as a bride adorns herself with her jewels."
  }, {
      Id: 644,
      Name: "Joy",
      Reference: "1 Thessalonians 2:20",
      Text: "For you are our glory and our joy."
  }, {
      Id: 645,
      Name: "Joy",
      Reference: "Psalms 19:8",
      Text: "Yahweh’s precepts are right, rejoicing the heart. Yahweh’s commandment is pure, enlightening the eyes."
  }, {
      Id: 646,
      Name: "Joy",
      Reference: "Proverbs 23:24",
      Text: "The father of the righteous has great joy. Whoever fathers a wise child delights in him."
  }, {
      Id: 647,
      Name: "Joy",
      Reference: "Romans 15:32",
      Text: "that I may come to you in joy through the will of God, and together with you, find rest."
  }, {
      Id: 648,
      Name: "Joy",
      Reference: "John 17:13",
      Text: "But now I come to you, and I say these things in the world, that they may have my joy made full in themselves."
  }, {
      Id: 649,
      Name: "Joy",
      Reference: "Habakkuk 3:17-18",
      Text: "For even though the fig tree doesn’t flourish, nor fruit be in the vines, the labor of the olive fails, the fields yield no food, the flocks are cut off from the fold, and there is no herd in the stalls, yet I will rejoice in Yahweh. I will be joyful in the God of my salvation!"
  }, {
      Id: 650,
      Name: "Joy",
      Reference: "Colossians 1:11",
      Text: "strengthened with all power, according to the might of his glory, for all endurance and perseverance with joy,"
  }, {
      Id: 651,
      Name: "Joy",
      Reference: "Jeremiah 15:16",
      Text: "Your words were found, and I ate them. Your words were to me a joy and the rejoicing of my heart, for I am called by your name, Yahweh, God of Armies."
  }, {
      Id: 652,
      Name: "Joy",
      Reference: "Psalms 97:11",
      Text: "Light is sown for the righteous, and gladness for the upright in heart."
  }, {
      Id: 653,
      Name: "Joy",
      Reference: "Esther 8:17",
      Text: "In every province and in every city, wherever the king’s commandment and his decree came, the Jews had gladness, joy, a feast and a holiday. Many from among the peoples of the land became Jews, for the fear of the Jews had fallen on them."
  }, {
      Id: 654,
      Name: "Joy",
      Reference: "2 Corinthians 12:10",
      Text: "Therefore I take pleasure in weaknesses, in injuries, in necessities, in persecutions, and in distresses, for Christ’s sake. For when I am weak, then am I strong."
  }, {
      Id: 655,
      Name: "Joy",
      Reference: "Isaiah 35:10",
      Text: "Then Yahweh’s ransomed ones will return, and come with singing to Zion; and everlasting joy will be on their heads. They will obtain gladness and joy, and sorrow and sighing will flee away.”"
  }, {
      Id: 656,
      Name: "Joy",
      Reference: "Isaiah 9:3",
      Text: "You have multiplied the nation. You have increased their joy. They rejoice before you according to the joy in harvest, as men rejoice when they divide the plunder."
  }, {
      Id: 657,
      Name: "Joy",
      Reference: "Isaiah 12:6",
      Text: "Cry aloud and shout, you inhabitant of Zion, for the Holy One of Israel is great among you!”"
  }, {
      Id: 658,
      Name: "Joy",
      Reference: "Philemon 1:7",
      Text: "For we have much joy and comfort in your love, because the hearts of the saints have been refreshed through you, brother."
  }, {
      Id: 660,
      Name: "Joy",
      Reference: "Psalms 51:8",
      Text: "Let me hear joy and gladness, that the bones which you have broken may rejoice."
  }, {
      Id: 661,
      Name: "Joy",
      Reference: "3 John 1:4",
      Text: "I have no greater joy than this: to hear about my children walking in truth."
  }, {
      Id: 662,
      Name: "Joy",
      Reference: "Jeremiah 29:11",
      Text: "For I know the thoughts that I think toward you,” says Yahweh, “thoughts of peace, and not of evil, to give you hope and a future."
  }, {
      Id: 663,
      Name: "Joy",
      Reference: "Nehemiah 12:43",
      Text: "They offered great sacrifices that day, and rejoiced, for God had made them rejoice with great joy; and the women and the children also rejoiced, so that the joy of Jerusalem was heard even far away."
  }, {
      Id: 664,
      Name: "Joy",
      Reference: "Matthew 25:21",
      Text: "His lord said to him, ‘Well done, good and faithful servant. You have been faithful over a few things, I will set you over many things. Enter into the joy of your lord.’"
  }, {
      Id: 665,
      Name: "Joy",
      Reference: "Philippians 2:1-2",
      Text: "If therefore there is any exhortation in Christ, if any consolation of love, if any fellowship of the Spirit, if any tender mercies and compassion, make my joy full by being like-minded, having the same love, being of one accord, of one mind;"
  }, {
      Id: 666,
      Name: "Joy",
      Reference: "Ezra 6:22",
      Text: "and kept the feast of unleavened bread seven days with joy; because Yahweh had made them joyful, and had turned the heart of the king of Assyria to them, to strengthen their hands in the work of God, the God of Israel’s house."
  }, {
      Id: 667,
      Name: "Joy",
      Reference: "Luke 2:10",
      Text: "The angel said to them, “Don’t be afraid, for behold, I bring you good news of great joy which will be to all the people."
  }, {
      Id: 668,
      Name: "Joy",
      Reference: "Luke 1:47",
      Text: "My spirit has rejoiced in God my Savior,"
  }, {
      Id: 669,
      Name: "Joy",
      Reference: "Acts 2:28",
      Text: "You made known to me the ways of life. You will make me full of gladness with your presence.’"
  }, {
      Id: 670,
      Name: "Joy",
      Reference: "Ecclesiastes 2:26",
      Text: "For to the man who pleases him, God gives wisdom, knowledge, and joy; but to the sinner he gives travail, to gather and to heap up, that he may give to him who pleases God. This also is vanity and a chasing after wind."
  }, {
      Id: 671,
      Name: "Joy",
      Reference: "1 Samuel 18:6",
      Text: "As they came, when David returned from the slaughter of the Philistine, the women came out of all the cities of Israel, singing and dancing, to meet King Saul with tambourines, with joy, and with instruments of music."
  }, {
      Id: 672,
      Name: "Joy",
      Reference: "2 Corinthians 6:10",
      Text: "as sorrowful yet always rejoicing, as poor yet making many rich, as having nothing and yet possessing all things."
  }, {
      Id: 673,
      Name: "Joy",
      Reference: "Psalms 126:2-3",
      Text: "Then our mouth was filled with laughter, and our tongue with singing. Then they said among the nations,“Yahweh has done great things for them.” Yahweh has done great things for us, and we are glad."
  }, {
      Id: 674,
      Name: "Joy",
      Reference: "Romans 5:11",
      Text: "Not only so, but we also rejoice in God through our Lord Jesus Christ, through whom we have now received the reconciliation."
  }, {
      Id: 675,
      Name: "Joy",
      Reference: "John 16:33",
      Text: "I have told you these things, that in me you may have peace. In the world you have trouble; but cheer up! I have overcome the world.”"
  }, {
      Id: 676,
      Name: "Joy",
      Reference: "Psalms 37:4",
      Text: "Also delight yourself in Yahweh, and he will give you the desires of your heart."
  }, {
      Id: 677,
      Name: "Joy",
      Reference: "1 Thessalonians 3:9",
      Text: "For what thanksgiving can we render again to God for you, for all the joy with which we rejoice for your sakes before our God,"
  }, {
      Id: 678,
      Name: "Joy",
      Reference: "Psalms 119:14",
      Text: "I have rejoiced in the way of your testimonies,as much as in all riches."
  }, {
      Id: 679,
      Name: "Joy",
      Reference: "Psalms 21:6",
      Text: "For you make him most blessed forever. You make him glad with joy in your presence."
  }, {
      Id: 680,
      Name: "Joy",
      Reference: "Acts 13:52",
      Text: "The disciples were filled with joy and with the Holy Spirit."
  }, {
      Id: 681,
      Name: "Joy",
      Reference: "Isaiah 12:3",
      Text: "Therefore with joy you will draw water out of the wells of salvation."
  }, {
      Id: 682,
      Name: "Joy",
      Reference: "Matthew 2:10",
      Text: "When they saw the star, they rejoiced with exceedingly great joy."
  }, {
      Id: 683,
      Name: "Joy",
      Reference: "Psalms 105:43",
      Text: "He brought his people out with joy, his chosen with singing."
  }, {
      Id: 684,
      Name: "Joy",
      Reference: "Luke 24:52",
      Text: "They worshiped him and returned to Jerusalem with great joy,"
  }, {
      Id: 685,
      Name: "Joy",
      Reference: "Psalms 70:4",
      Text: "Let all those who seek you rejoice and be glad in you.Let those who love your salvation continually say,“Let God be exalted!”"
  }, {
      Id: 686,
      Name: "Joy",
      Reference: "2 Corinthians 8:1-2",
      Text: "Moreover, brothers, we make known to you the grace of God which has been given in the assemblies of Macedonia, how in a severe ordeal of affliction, the abundance of their joy and their deep poverty abounded to the riches of their generosity."
  }, {
      Id: 687,
      Name: "Joy",
      Reference: "Psalms 126:6",
      Text: "He who goes out weeping, carrying seed for sowing, will certainly come again with joy, carrying his sheaves."
  }, {
      Id: 688,
      Name: "Joy",
      Reference: "1 Kings 1:40",
      Text: "All the people came up after him, and the people piped with pipes, and rejoiced with great joy, so that the earth shook with their sound."
  }, {
      Id: 689,
      Name: "Joy",
      Reference: "1 Timothy 6:17",
      Text: "Charge those who are rich in this present age that they not be arrogant, nor have their hope set on the uncertainty of riches, but on the living God, who richly provides us with everything to enjoy;"
  }, {
      Id: 690,
      Name: "Joy",
      Reference: "2 Corinthians 1:24",
      Text: "We don’t control your faith, but are fellow workers with you for your joy. For you stand firm in faith."
  }, {
      Id: 691,
      Name: "Joy",
      Reference: "Luke 10:17",
      Text: "The seventy returned with joy, saying, “Lord, even the demons are subject to us in your name!”"
  }, {
      Id: 692,
      Name: "Focus",
      Reference: "Proverbs 16:3",
      Text: "Commit your deeds to the LORD, and your plans shall succeed.",
    Lie: "Your plans will fail especially if God is involved."
  }, {
      Id: 693,
      Name: "Focus",
      Reference: "Philippians 3:14",
      Text: "I press on toward the goal for the prize of the high calling of God in Christ Jesus.",
    Lie: "It is best to keep dwelling on the past."
  }, {
      Id: 694,
      Name: "Focus",
      Reference: "Romans 12:2",
      Text: "Don’t be conformed to this world, but be transformed by the renewing of your mind, so that you may prove what is the good, well-pleasing, and perfect will of God.",
    Lie: "Be like everyone else and fit in."
  }, {
      Id: 695,
      Name: "Focus",
      Reference: "Matthew 24:13",
      Text: "But he who endures to the end will be saved.",
    Lie: "Even if you give up your faith you can't lose your salvation."
  }, {
      Id: 696,
      Name: "Focus",
      Reference: "Hebrews 12:1",
      Text: "Therefore let’s also, seeing we are surrounded by so great a cloud of witnesses, lay aside every weight and the sin which so easily entangles us, and let’s run with perseverance the race that is set before us.",
    Lie: "There are lots of things in this world you must constantly give your attention to."
  }, {
      Id: 697,
      Name: "Focus",
      Reference: "Proverbs 4:25",
      Text: "Let your eyes look straight ahead. Fix your gaze directly before you.",
    Lie: "Keep your eye out for enticing people and things."
  }, {
      Id: 698,
      Name: "Focus",
      Reference: "Philippians 4:13",
      Text: "I can do all things through Christ who strengthens me.",
    Lie: "You may as well give up because you can't do it."
  }, {
      Id: 699,
      Name: "Focus",
      Reference: "Colossians 3:2",
      Text: "Set your mind on the things that are above, not on the things that are on the earth.",
    Lie: "Forget about heaven, focus on what is here on earth."
  }, {
      Id: 700,
      Name: "Focus",
      Reference: "Romans 12:21",
      Text: "Don’t be overcome by evil, but overcome evil with good.",
    Lie: "If someone does bad to you, get them back."
  }, {
      Id: 701,
      Name: "Focus",
      Reference: "Isaiah 41:10",
      Text: "Don’t you be afraid, for I am with you. Don’t be dismayed, for I am your God. I will strengthen you. Yes, I will help you. Yes, I will uphold you with the right hand of my righteousness.",
    Lie: "It is probably time to panic. God has abandoned you."
  }, {
      Id: 702,
      Name: "Focus",
      Reference: "Luke 10:41-42",
      Text: "Jesus answered her,“Martha, Martha, you are anxious and troubled about many things, but one thing is needed. Mary has chosen the good part, which will not be taken away from her.”",
    Lie: "Focus on doing stuff. You don't have time to listen to God."
  }, {
      Id: 703,
      Name: "Focus",
      Reference: "Matthew 7:13-14",
      Text: "“Enter in by the narrow gate; for the gate is wide and the way is broad that leads to destruction, and there are many who enter in by it. How narrow is the gate and the way is restricted that leads to life! There are few who find it.",
    Lie: "Almost everyone makes it to heaven, so don't be concerned about it."
  }, {
      Id: 705,
      Name: "Focus",
      Reference: "Matthew 6:33",
      Text: "But seek first God’s Kingdom and his righteousness",
    Lie: "Seek first money and things, and you can think about God if there is any time left over."
  }, {
      Id: 706,
      Name: "Focus",
      Reference: "Romans 15:4",
      Text: "For whatever things were written before were written for our learning, that through perseverance and through encouragement of the Scriptures we might have hope."
  }, {
      Id: 707,
      Name: "Focus",
      Reference: "Luke 21:36",
      Text: "Therefore be watchful all the time, praying that you may be counted worthy to escape all these things that will happen, and to stand before the Son of Man.”",
    Lie: "You are getting sleepy."
  }, {
      Id: 708,
      Name: "Focus",
      Reference: "Romans 13:11",
      Text: "Do this, knowing the time, that it is already time for you to awaken out of sleep, for salvation is now nearer to us than when we first believed.",
    Lie: "There is plenty of time to get your act together. Just chill."
  }, {
      Id: 710,
      Name: "Focus",
      Reference: "Isaiah 26:3",
      Text: "You will keep whoever’s mind is steadfast in perfect peace, because he trusts in you.",
    Lie: "You can't trust God, and you will feel better if you stop thinking abouyt him."
  }, {
      Id: 711,
      Name: "Focus",
      Reference: "Philippians 4:8",
      Text: "Finally, brothers, whatever things are true, whatever things are honorable, whatever things are just, whatever things are pure, whatever things are lovely, whatever things are of good report: if there is any virtue and if there is anything worthy of praise, think about these things.",
    Lie: "Best if you think about all the bad stuff that is happening."
  }, {
      Id: 712,
      Name: "Focus",
      Reference: "Ephesians 4:29",
      Text: "Let no corrupt speech proceed out of your mouth, but only what is good for building others up as the need may be, that it may give grace to those who hear.",
    Lie: "Say whatever comes to mind, and let people deal with it."
  }, {
      Id: 713,
      Name: "Focus",
      Reference: "Isaiah 50:7",
      Text: "For the Lord Yahweh will help me. Therefore I have not been confounded. Therefore I have set my face like a flint, and I know that I won’t be disappointed.",
    Lie: "Focus and determination in God might not lead to success."
  }, {
      Id: 714,
      Name: "Focus",
      Reference: "2 Timothy 1:7",
      Text: "For God didn’t give us a spirit of fear, but of power, love, and self-control.",
    Lie: "Just let your mind go wherever it wants."
  }, {
      Id: 715,
      Name: "Focus",
      Reference: "1 Corinthians 2:14",
      Text: "Now the natural man doesn’t receive the things of God’s Spirit, for they are foolishness to him; and he can’t know them, because they are spiritually discerned."
  },  {
    Id: 717,
      Name: "Focus",
      Reference: "Matthew 24:42",
      Text: "Watch therefore, for you don’t know in what hour your Lord comes."
  }, {
      Id: 718,
      Name: "Focus",
      Reference: "Psalms 119:15",
      Text: "I will meditate on your precepts, and consider your ways.",
    Lie: "Don't waste your time thinking about how God does things."
  }, {
      Id: 719,
      Name: "Focus",
      Reference: "Matthew 6:24",
      Text: "“No one can serve two masters, for either he will hate the one and love the other, or else he will be devoted to one and despise the other. You can’t serve both God and Mammon.",
    Lie: "Give your focus to making money."
  }, {
      Id: 720,
      Name: "Focus",
      Reference: "Joshua 1:8",
      Text: "This book of the law shall not depart from your mouth, but you shall meditate on it day and night, that you may observe to do according to all that is written in it; for then you shall make your way prosperous, and then you shall have good success."
  }, {
      Id: 721,
      Name: "Focus",
      Reference: "Matthew 24:44",
      Text: "Therefore also be ready, for in an hour that you don’t expect, the Son of Man will come.",
    Lie: "There is no need to be ready as if Jesus could come."
  }, {
      Id: 723,
      Name: "Focus",
      Reference: "1 Peter 5:8",
      Text: "Be sober and self-controlled. Be watchful. Your adversary, the devil, walks around like a roaring lion, seeking whom he may devour.",
    Lie: "Just live for fun and don't worry. The devil can't hurt you anyway."
  }, {
      Id: 724,
      Name: "Focus",
      Reference: "1 Peter 2:24",
      Text: "He himself bore our sins in his body on the tree, that we, having died to sins, might live to righteousness. You were healed by his wounds."
  }, {
      Id: 725,
      Name: "Focus",
      Reference: "Hebrews 12:2",
      Text: "looking to Jesus, the author and perfecter of faith, who for the joy that was set before him endured the cross, despising its shame, and has sat down at the right hand of the throne of God."
  }, {
      Id: 726,
      Name: "Focus",
      Reference: "2 Timothy 2:4",
      Text: "No soldier on duty entangles himself in the affairs of life, that he may please him who enrolled him as a soldier."
  }, {
      Id: 727,
      Name: "Focus",
      Reference: "Hebrews 3:1",
      Text: "Therefore, holy brothers, partakers of a heavenly calling, consider the Apostle and High Priest of our confession: Jesus,"
  }, {
      Id: 728,
      Name: "Focus",
      Reference: "1 Peter 1:13",
      Text: "Therefore prepare your minds for action. Be sober, and set your hope fully on the grace that will be brought to you at the revelation of Jesus Christ—"
  }, {
      Id: 729,
      Name: "Focus",
      Reference: "2 Timothy 2:15",
      Text: "Give diligence to present yourself approved by God, a workman who doesn’t need to be ashamed, properly handling the Word of Truth."
  }, {
      Id: 730,
      Name: "Focus",
      Reference: "Colossians 3:1",
      Text: "If then you were raised together with Christ, seek the things that are above, where Christ is, seated on the right hand of God."
  }, {
      Id: 731,
      Name: "Focus",
      Reference: "Isaiah 42:5",
      Text: "God Yahweh, he who created the heavens and stretched them out, he who spread out the earth and that which comes out of it, he who gives breath to its people and spirit to those who walk in it, says:"
  }, {
      Id: 732,
      Name: "Focus",
      Reference: "2 Peter 3:3-4",
      Text: "knowing this first, that in the last days mockers will come, walking after their own lusts and saying, “Where is the promise of his coming? For, from the day that the fathers fell asleep, all things continue as they were from the beginning of the creation.”"
  }, {
      Id: 733,
      Name: "Focus",
      Reference: "Luke 21:34-36",
      Text: "“So be careful, or your hearts will be loaded down with carousing, drunkenness, and cares of this life, and that day will come on you suddenly. For it will come like a snare on all those who dwell on the surface of all the earth. Therefore be watchful all the time, praying that you may be counted worthy to escape all these things that will happen, and to stand before the Son of Man.”"
  }, {
      Id: 734,
      Name: "Focus",
      Reference: "Matthew 24:22",
      Text: "Unless those days had been shortened, no flesh would have been saved. But for the sake of the chosen ones, those days will be shortened."
  }, {
      Id: 735,
      Name: "Focus",
      Reference: "Proverbs 2:2-5",
      Text: "so as to turn your ear to wisdom, and apply your heart to understanding; yes, if you call out for discernment, and lift up your voice for understanding; if you seek her as silver, and search for her as for hidden treasures; then you will understand the fear of Yahweh, and find the knowledge of God."
  }, {
      Id: 736,
      Name: "Focus",
      Reference: "1 Corinthians 10:13",
      Text: "No temptation has taken you except what is common to man. God is faithful, who will not allow you to be tempted above what you are able, but will with the temptation also make the way of escape, that you may be able to endure it."
  }, {
      Id: 737,
      Name: "Focus",
      Reference: "Romans 8:5",
      Text: "For those who live according to the flesh set their minds on the things of the flesh, but those who live according to the Spirit, the things of the Spirit."
  }, {
      Id: 739,
      Name: "Focus",
      Reference: "2 Timothy 3:16-17",
      Text: "Every Scripture is God-breathed and profitable for teaching, for reproof, for correction, and for instruction in righteousness, that each person who belongs to God may be complete, thoroughly equipped for every good work."
  }, {
      Id: 740,
      Name: "Focus",
      Reference: "Colossians 2:8",
      Text: "Be careful that you don’t let anyone rob you through his philosophy and vain deceit, after the tradition of men, after the elemental spirits of the world, and not after Christ.",
    Lie: "Try to follow and respect the traditions of men."
  }, {
      Id: 741,
      Name: "Focus",
      Reference: "Philippians 2:5",
      Text: "Have this in your mind, which was also in Christ Jesus,"
  }, {
      Id: 742,
      Name: "Focus",
      Reference: "Romans 12:1-2",
      Text: "Therefore I urge you, brothers, by the mercies of God, to present your bodies a living sacrifice, holy, acceptable to God, which is your spiritual service. Don’t be conformed to this world, but be transformed by the renewing of your mind, so that you may prove what is the good, well-pleasing, and perfect will of God."
  }, {
      Id: 743,
      Name: "Focus",
      Reference: "John 3:16",
      Text: "For God so loved the world, that he gave his only born Son, that whoever believes in him should not perish, but have eternal life."
  }, {
      Id: 744,
      Name: "Focus",
      Reference: "Matthew 5:16",
      Text: "Even so, let your light shine before men, that they may see your good works and glorify your Father who is in heaven."
  }, {
      Id: 746,
      Name: "Focus",
      Reference: "Psalms 1:2",
      Text: "but his delight is in Yahweh’s law. On his law he meditates day and night."
  }, {
      Id: 747,
      Name: "Focus",
      Reference: "Philippians 3:13",
      Text: "Brothers, I don’t regard myself as yet having taken hold, but one thing I do: forgetting the things which are behind and stretching forward to the things which are before,"
  }, {
      Id: 748,
      Name: "Focus",
      Reference: "Matthew 6:34",
      Text: "Therefore don’t be anxious for tomorrow, for tomorrow will be anxious for itself. Each day’s own evil is sufficient."
  }, {
      Id: 749,
      Name: "Focus",
      Reference: "1 Timothy 4:8",
      Text: "For bodily exercise has some value, but godliness has value in all things, having the promise of the life which is now and of that which is to come."
  },  {
      Id: 752,
      Name: "Focus",
      Reference: "1 Peter 2:2",
      Text: "as newborn babies, long for the pure spiritual milk, that with it you may grow,"
  }, {
      Id: 753,
      Name: "Focus",
      Reference: "Hebrews 12:1-2",
      Text: "Therefore let’s also, seeing we are surrounded by so great a cloud of witnesses, lay aside every weight and the sin which so easily entangles us, and let’s run with perseverance the race that is set before us, looking to Jesus, the author and perfecter of faith, "
  }, {
      Id: 754,
      Name: "Focus",
      Reference: "Philippians 3:12",
      Text: "Not that I have already obtained, or am already made perfect; but I press on, that I may take hold of that for which also I was taken hold of by Christ Jesus."
  }, {
      Id: 755,
      Name: "Focus",
      Reference: "1 Corinthians 6:19-20",
      Text: "Or don’t you know that your body is a temple of the Holy Spirit who is in you, whom you have from God? You are not your own, for you were bought with a price. Therefore glorify God in your body and in your spirit, which are God’s."
  }, {
      Id: 756,
      Name: "Focus",
      Reference: "Romans 8:5-6",
      Text: "For those who live according to the flesh set their minds on the things of the flesh, but those who live according to the Spirit, the things of the Spirit. For the mind of the flesh is death, but the mind of the Spirit is life and peace;"
  }, {
      Id: 757,
      Name: "Focus",
      Reference: "Acts 2:40",
      Text: "With many other words he testified and exhorted them, saying, “Save yourselves from this crooked generation!”"
  }, {
      Id: 758,
      Name: "Focus",
      Reference: "Jeremiah 29:11",
      Text: "For I know the thoughts that I think toward you,” says Yahweh, “thoughts of peace, and not of evil, to give you hope and a future."
  }, {
      Id: 760,
      Name: "Focus",
      Reference: "1 John 2:15",
      Text: "Don’t love the world or the things that are in the world. If anyone loves the world, the Father’s love isn’t in him."
  }, {
      Id: 761,
      Name: "Focus",
      Reference: "1 John 1:9",
      Text: "If we confess our sins, he is faithful and righteous to forgive us the sins and to cleanse us from all unrighteousness."
  }, {
      Id: 762,
      Name: "Focus",
      Reference: "1 Timothy 4:12",
      Text: "Let no man despise your youth; but be an example to those who believe, in word, in your way of life, in love, in spirit, in faith, and in purity."
  }, {
      Id: 763,
      Name: "Focus",
      Reference: "Colossians 3:1",
      Text: "If then you were raised together with Christ, seek the things that are above, where Christ is, seated on the right hand of God. "
  }, {
      Id: 764,
      Name: "Focus",
      Reference: "Romans 12:9",
      Text: "Let love be without hypocrisy. Abhor that which is evil. Cling to that which is good."
  }, {
      Id: 765,
      Name: "Focus",
      Reference: "John 14:6",
      Text: "Jesus said to him,“I am the way, the truth, and the life. No one comes to the Father, except through me."
  }, {
      Id: 766,
      Name: "Focus",
      Reference: "Ecclesiastes 9:10",
      Text: "Whatever your hand finds to do, do it with your might; for there is no work, nor plan, nor knowledge, nor wisdom, in Sheol, where you are going."
  }, {
      Id: 767,
      Name: "Focus",
      Reference: "Colossians 2:8",
      Text: "Be careful that you don’t let anyone rob you through his philosophy and vain deceit, after the tradition of men, after the elemental spirits of the world, and not after Christ."
  }, {
      Id: 768,
      Name: "Focus",
      Reference: "2 Corinthians 10:5",
      Text: "throwing down imaginations and every high thing that is exalted against the knowledge of God and bringing every thought into captivity to the obedience of Christ,"
  }, {
      Id: 769,
      Name: "Focus",
      Reference: "Psalms 123:2",
      Text: "Behold, as the eyes of servants look to the hand of their master, as the eyes of a maid to the hand of her mistress, so our eyes look to Yahweh, our God, until he has mercy on us."
  }, {
      Id: 770,
      Name: "Focus",
      Reference: "Philippians 4:19",
      Text: "My God will supply every need of yours according to his riches in glory in Christ Jesus."
  }, {
      Id: 771,
      Name: "Focus",
      Reference: "Philippians 4:9",
      Text: "Do the things which you learned, received, heard, and saw in me, and the God of peace will be with you."
  }, {
      Id: 772,
      Name: "Focus",
      Reference: "Matthew 24:3",
      Text: "As he sat on the Mount of Olives, the disciples came to him privately, saying, “Tell us, when will these things be? What is the sign of your coming, and of the end of the age?”"
  }, {
      Id: 773,
      Name: "Focus",
      Reference: "1 Timothy 6:17",
      Text: "Charge those who are rich in this present age that they not be arrogant, nor have their hope set on the uncertainty of riches, but on the living God, who richly provides us with everything to enjoy;"
  }, {
      Id: 774,
      Name: "Focus",
      Reference: "1 Corinthians 6:20",
      Text: "for you were bought with a price. Therefore glorify God in your body and in your spirit, which are God’s."
  }, {
      Id: 775,
      Name: "Focus",
      Reference: "Acts 3:19",
      Text: "Repent therefore, and turn again, that your sins may be blotted out, so that there may come times of refreshing from the presence of the Lord",
  }, {
      Id: 777,
      Name: "Focus",
      Reference: "1 Corinthians 2:16",
      Text: "“For who has known the mind of the Lord that he should instruct him?” But we have Christ’s mind."
  },  {
      Id: 780,
      Name: "Focus",
      Reference: "Psalms 46:10",
      Text: "“Be still, and know that I am God. I will be exalted among the nations. I will be exalted in the earth.”"
  }, {
      Id: 781,
      Name: "Focus",
      Reference: "1 Peter 3:15",
      Text: "But sanctify the Lord God in your hearts. Always be ready to give an answer to everyone who asks you a reason concerning the hope that is in you, with humility and fear,"
  }, {
      Id: 782,
      Name: "Focus",
      Reference: "Philippians 4:6",
      Text: "In nothing be anxious, but in everything, by prayer and petition with thanksgiving, let your requests be made known to God."
  }, {
      Id: 783,
      Name: "Focus",
      Reference: "1 Corinthians 7:23",
      Text: "You were bought with a price. Don’t become bondservants of men.",
    Lie: "You belong to yourself and can do what you want."
  }, {
      Id: 784,
      Name: "Focus",
      Reference: "Acts 17:30",
      Text: "The times of ignorance therefore God overlooked. But now he commands that all people everywhere should repent",
    Lie: "God understands your heart and doesn't expect you to change."
  }, {
      Id: 785,
      Name: "Focus",
      Reference: "Psalms 16:8-9",
      Text: "I have set Yahweh always before me. Because he is at my right hand, I shall not be moved. Therefore my heart is glad, and my tongue rejoices. My body shall also dwell in safety.",
    Lie: "If you keep your eyes on the Lord for sure something will go really wrong."
  }, {
      Id: 786,
      Name: "Focus",
      Reference: "Revelation 3:15",
      Text: "I know your works, that you are neither cold nor hot. I wish you were cold or hot.",
    Lie: "You can be religious, but don't take it too far."
  }, {
      Id: 787,
      Name: "Focus",
      Reference: "Philippians 3:19",
      Text: "whose end is destruction, whose god is the belly, and whose glory is in their shame, who think about earthly things."
  }, {
      Id: 788,
      Name: "Prosperity",
      Reference: "Deuteronomy 8:18",
      Text: "But you shall remember Yahweh your God, for it is he who gives you power to get wealth, that he may establish his covenant which he swore to your fathers, as it is today.",
    Lie: "God is not interested in his people having any wealth."
  }, {
      Id: 789,
      Name: "Prosperity",
      Reference: "Philippians 4:19",
      Text: "My God will supply every need of yours according to his riches in glory in Christ Jesus.",
    Lie: "God won't provide. He'll find a reason not to."
  }, {
      Id: 790,
      Name: "Prosperity",
      Reference: "Jeremiah 29:11",
      Text: "For I know the thoughts that I think toward you,” says Yahweh, “thoughts of peace, and not of evil, to give you hope and a future.",
    Lie: "God is always thinking about how to punish you."
  }, {
      Id: 791,
      Name: "Prosperity",
      Reference: "3 John 1:2",
      Text: "Beloved, I pray that you may prosper in all things and be healthy, even as your soul prospers.",
    Lie: "In the New Testament, God doesn't want people to prosper in all things."
  }, {
      Id: 793,
      Name: "Prosperity",
      Reference: "Joshua 1:8",
      Text: "This book of the law shall not depart from your mouth, but you shall meditate on it day and night, that you may observe to do according to all that is written in it; for then you shall make your way prosperous, and then you shall have good success.",
    Lie: "There is no relationship between your meditation and your success in life."
  }, {
      Id: 794,
      Name: "Prosperity",
      Reference: "Psalms 128:2",
      Text: "For you will eat the labor of your hands. You will be happy, and it will be well with you.",
    Lie: "A lot of times what you work for you won't enjoy anyway."
  }, {
      Id: 795,
      Name: "Prosperity",
      Reference: "2 Corinthians 9:8",
      Text: "And God is able to make all grace abound to you, that you, always having all sufficiency in everything, may abound to every good work.",
    Lie: "There is never enough for God's work."
  },  {
      Id: 797,
      Name: "Prosperity",
      Reference: "2 Corinthians 8:9",
      Text: "For you know the grace of our Lord Jesus Christ, that though he was rich, yet for your sakes he became poor, that you through his poverty might become rich.",
    Lie: "Jesus became poor so you should be poor."
  }, {
      Id: 798,
      Name: "Prosperity",
      Reference: "Proverbs 28:25",
      Text: "One who is greedy stirs up strife",
    Lie: "Be greedy. Greed is good."
  }, {
      Id: 799,
      Name: "Prosperity",
      Reference: "Luke 6:38",
      Text: "“Give, and it will be given to you: good measure, pressed down, shaken together, and running over, will be given to you. For with the same measure you measure it will be measured back to you.”",
    Lie: "Giving doesn't change your outcomes in life. It just sets you back."
  }, {
      Id: 800,
      Name: "Prosperity",
      Reference: "Zechariah 9:12",
      Text: "Turn to the stronghold, you prisoners of hope! Even today I declare that I will restore double to you."
  }, {
      Id: 801,
      Name: "Prosperity",
      Reference: "Nehemiah 2:20",
      Text: "Then I answered them, and said to them, “The God of heaven will prosper us. Therefore we, his servants, will arise and build; but you have no portion, nor right, nor memorial in Jerusalem.”"
  }, {
      Id: 802,
      Name: "Prosperity",
      Reference: "Deuteronomy 28:1",
      Text: "It shall happen, if you shall listen diligently to Yahweh your God’s voice, to observe to do all his commandments which I command you today, that Yahweh your God will set you high above all the nations of the earth."
  }, {
      Id: 803,
      Name: "Prosperity",
      Reference: "Psalms 1:2-3",
      Text: "but his delight is in Yahweh’s law. On his law he meditates day and night. He will be like a tree planted by the streams of water, that produces its fruit in its season, whose leaf also does not wither. Whatever he does shall prosper.",
    Lie: "It won't do you any good to think so much on the Bible."
  }, {
      Id: 804,
      Name: "Prosperity",
      Reference: "Proverbs 10:22",
      Text: "Yahweh’s blessing brings wealth, and he adds no trouble to it."
  }, {
      Id: 806,
      Name: "Prosperity",
      Reference: "Jeremiah 29:11",
      Text: "For I know the thoughts that I think toward you,” says Yahweh, “thoughts of peace, and not of evil, to give you hope and a future."
  }, {
      Id: 807,
      Name: "Prosperity",
      Reference: "Jeremiah 17:10",
      Text: "“I, Yahweh, search the mind. I try the heart,even to give every man according to his ways, according to the fruit of his doings.”"
  }, {
      Id: 808,
      Name: "Prosperity",
      Reference: "Psalms 112:1-3",
      Text: "Praise Yah! Blessed is the man who fears Yahweh, who delights greatly in his commandments. His offspring will be mighty in the land. The generation of the upright will be blessed. Wealth and riches are in his house. His righteousness endures forever."
  }, {
      Id: 809,
      Name: "Prosperity",
      Reference: "Proverbs 3:9-10",
      Text: "Honor Yahweh with your substance, with the first fruits of all your increase; so your barns will be filled with plenty, and your vats will overflow with new wine."
  }, {
      Id: 810,
      Name: "Prosperity",
      Reference: "Psalms 34:8-10",
      Text: "Oh taste and see that Yahweh is good.Blessed is the man who takes refuge in him. Oh fear Yahweh, you his saints, for there is no lack with those who fear him. The young lions do lack, and suffer hunger, but those who seek Yahweh shall not lack any good thing."
  }, {
      Id: 811,
      Name: "Prosperity",
      Reference: "Psalms 37:18-19",
      Text: "Yahweh knows the days of the perfect. Their inheritance shall be forever. They shall not be disappointed in the time of evil. In the days of famine they shall be satisfied."
  }, {
      Id: 812,
      Name: "Prosperity",
      Reference: "Psalms 128:1",
      Text: "Blessed is everyone who fears Yahweh, who walks in his ways."
  }, {
      Id: 813,
      Name: "Prosperity",
      Reference: "Psalms 84:11",
      Text: "For Yahweh God is a sun and a shield. Yahweh will give grace and glory. He withholds no good thing from those who walk blamelessly."
  }, {
      Id: 814,
      Name: "Prosperity",
      Reference: "Ecclesiastes 7:14",
      Text: "In the day of prosperity be joyful, and in the day of adversity consider; yes, God has made the one side by side with the other, to the end that man should not find out anything after him."
  }, {
      Id: 815,
      Name: "Prosperity",
      Reference: "Psalms 24:1",
      Text: "The earth is Yahweh’s, with its fullness; the world, and those who dwell in it."
  }, {
      Id: 816,
      Name: "Prosperity",
      Reference: "John 10:10",
      Text: "The thief only comes to steal, kill, and destroy. I came that they may have life, and may have it abundantly."
  }, {
      Id: 817,
      Name: "Prosperity",
      Reference: "Mark 10:29-30",
      Text: "Jesus said,“Most certainly I tell you, there is no one who has left house, or brothers, or sisters, or father, or mother, or wife, or children, or land, for my sake, and for the sake of the Good News, but he will receive one hundred times more now in this time: houses, brothers, sisters, mothers, children, and land, with persecutions; and in the age to come eternal life."
  }, {
      Id: 818,
      Name: "Prosperity",
      Reference: "Psalms 118:25",
      Text: "Save us now, we beg you, Yahweh! Yahweh, we beg you, send prosperity now."
  }, {
      Id: 819,
      Name: "Prosperity",
      Reference: "Proverbs 30:8-9",
      Text: "Remove far from me falsehood and lies. Give me neither poverty nor riches. Feed me with the food that is needful for me, lest I be full, deny you, and say, ‘ Who is Yahweh?’ or lest I be poor, and steal, and so dishonor the name of my God."
  }, {
      Id: 820,
      Name: "Prosperity",
      Reference: "1 Chronicles 4:10",
      Text: "Jabez called on the God of Israel, saying, “Oh that you would bless me indeed, and enlarge my border! May your hand be with me, and may you keep me from evil, that I may not cause pain!” God granted him that which he requested."
  }, {
      Id: 821,
      Name: "Prosperity",
      Reference: "Psalms 40:17",
      Text: "But I am poor and needy. May the Lord think about me. You are my help and my deliverer.Don’t delay, my God."
  }, {
      Id: 822,
      Name: "Prosperity",
      Reference: "Matthew 25:29",
      Text: "“For to everyone who has will be given, and he will have abundance, but from him who doesn’t have, even that which he has will be taken away.’"
  }, {
      Id: 823,
      Name: "Prosperity",
      Reference: "Psalms 35:27",
      Text: "Let those who favor my righteous cause shout for joy and be glad.Yes, let them say continually, “May Yahweh be magnified, who has pleasure in the prosperity of his servant!”"
  }, {
      Id: 824,
      Name: "Prosperity",
      Reference: "Genesis 33:11",
      Text: "Please take the gift that I brought to you, because God has dealt graciously with me, and because I have enough.” He urged him, and he took it."
  }, {
      Id: 825,
      Name: "Prosperity",
      Reference: "Proverbs 15:15",
      Text: "All the days of the afflicted are wretched, but one who has a cheerful heart enjoys a continual feast."
  }, {
      Id: 826,
      Name: "Prosperity",
      Reference: "Deuteronomy 30:8-9",
      Text: "You shall return and obey Yahweh’s voice, and do all his commandments which I command you today. Yahweh your God will make you prosperous in all the work of your hand, in the fruit of your body, in the fruit of your livestock, and in the fruit of your ground, for good; for Yahweh will again rejoice over you for good, as he rejoiced over your fathers,"
  }, {
      Id: 827,
      Name: "Prosperity",
      Reference: "Isaiah 48:17",
      Text: "Yahweh, your Redeemer, the Holy One of Israel, says:“I am Yahweh your God, who teaches you to profit, who leads you by the way that you should go."
  }, {
      Id: 828,
      Name: "Prosperity",
      Reference: "Psalms 23:1-3",
      Text: "Yahweh is my shepherd; I shall lack nothing. He makes me lie down in green pastures. He leads me beside still waters. He restores my soul. He guides me in the paths of righteousness for his name’s sake."
  }, {
      Id: 829,
      Name: "Prosperity",
      Reference: "Genesis 15:1",
      Text: "After these things Yahweh’s word came to Abram in a vision, saying, “Don’t be afraid, Abram. I am your shield, your exceedingly great reward.”"
  }, {
      Id: 830,
      Name: "Prosperity",
      Reference: "Hebrews 11:6",
      Text: "Without faith it is impossible to be well pleasing to him, for he who comes to God must believe that he exists, and that he is a rewarder of those who seek him."
  }, {
      Id: 831,
      Name: "Prosperity",
      Reference: "Proverbs 22:4",
      Text: "The result of humility and the fear of Yahweh is wealth, honor, and life."
  }, {
      Id: 832,
      Name: "Prosperity",
      Reference: "1 Kings 2:3",
      Text: "and keep the instruction of Yahweh your God, to walk in his ways, to keep his statutes, his commandments, his ordinances, and his testimonies, according to that which is written in the law of Moses, that you may prosper in all that you do and wherever you turn yourself."
  }, {
      Id: 833,
      Name: "Prosperity",
      Reference: "Deuteronomy 8:1",
      Text: "You shall observe to do all the commandments which I command you today, that you may live, and multiply, and go in and possess the land which Yahweh swore to your fathers."
  }, {
      Id: 834,
      Name: "Prosperity",
      Reference: "Job 36:11",
      Text: "If they listen and serve him, they will spend their days in prosperity, and their years in pleasures."
  }, {
      Id: 835,
      Name: "Prosperity",
      Reference: "Deuteronomy 15:10",
      Text: "You shall surely give, and your heart shall not be grieved when you give to him, because it is for this thing Yahweh your God will bless you in all your work and in all that you put your hand to."
  }, {
      Id: 836,
      Name: "Prosperity",
      Reference: "Genesis 12:2-3",
      Text: "I will make of you a great nation. I will bless you and make your name great. You will be a blessing. I will bless those who bless you, and I will curse him who treats you with contempt. All the families of the earth will be blessed through you.”"
  },{
      Id: 838,
      Name: "Prosperity",
      Reference: "Hebrews 13:5",
      Text: "Be free from the love of money, content with such things as you have, for he has said, “I will in no way leave you, neither will I in any way forsake you.”"
  }, {
      Id: 839,
      Name: "Prosperity",
      Reference: "Ephesians 3:20",
      Text: "Now to him who is able to do exceedingly abundantly above all that we ask or think, according to the power that works in us,"
  }, {
      Id: 840,
      Name: "Prosperity",
      Reference: "Isaiah 1:19",
      Text: "If you are willing and obedient, you will eat the good of the land;"
  }, {
      Id: 841,
      Name: "Prosperity",
      Reference: "2 Chronicles 20:20",
      Text: "They rose early in the morning and went out into the wilderness of Tekoa. As they went out, Jehoshaphat stood and said, “Listen to me, Judah and you inhabitants of Jerusalem! Believe in Yahweh your God, so you will be established! Believe his prophets, so you will prosper.”"
  }, {
      Id: 842,
      Name: "Prosperity",
      Reference: "Proverbs 13:4",
      Text: "The soul of the sluggard desires, and has nothing, but the desire of the diligent shall be fully satisfied."
  }, {
      Id: 843,
      Name: "Prosperity",
      Reference: "John 15:5",
      Text: "I am the vine. You are the branches. He who remains in me and I in him bears much fruit, for apart from me you can do nothing."
  }, {
      Id: 844,
      Name: "Prosperity",
      Reference: "Psalms 37:4",
      Text: "Also delight yourself in Yahweh, and he will give you the desires of your heart."
  }, {
      Id: 845,
      Name: "Prosperity",
      Reference: "Colossians 3:13",
      Text: "bearing with one another, and forgiving each other, if any man has a complaint against any; even as Christ forgave you, so you also do."
  }, {
      Id: 846,
      Name: "Prosperity",
      Reference: "Nahum 1:7",
      Text: "Yahweh is good, a stronghold in the day of trouble; and he knows those who take refuge in him."
  }, {
      Id: 847,
      Name: "Prosperity",
      Reference: "Isaiah 60:5",
      Text: "Then you shall see and be radiant, and your heart will thrill and be enlarged; because the abundance of the sea will be turned to you. The wealth of the nations will come to you."
  }, {
      Id: 848,
      Name: "Prosperity",
      Reference: "Psalms 68:6",
      Text: "God sets the lonely in families. He brings out the prisoners with singing,but the rebellious dwell in a sun-scorched land."
  }, {
      Id: 849,
      Name: "Prosperity",
      Reference: "1 Samuel 2:8",
      Text: "He raises up the poor out of the dust. He lifts up the needy from the dunghill to make them sit with princes and inherit the throne of glory. For the pillars of the earth are Yahweh’s. He has set the world on them."
  }, {
      Id: 850,
      Name: "Prosperity",
      Reference: "2 Peter 1:3",
      Text: "seeing that his divine power has granted to us all things that pertain to life and godliness, through the knowledge of him who called us by his own glory and virtue,"
  }, {
      Id: 851,
      Name: "Prosperity",
      Reference: "James 1:4",
      Text: "Let endurance have its perfect work, that you may be perfect and complete, lacking in nothing."
  }, {
      Id: 852,
      Name: "Prosperity",
      Reference: "Romans 8:11",
      Text: "But if the Spirit of him who raised up Jesus from the dead dwells in you, he who raised up Christ Jesus from the dead will also give life to your mortal bodies through his Spirit who dwells in you."
  }, {
      Id: 853,
      Name: "Prosperity",
      Reference: "Ecclesiastes 10:19",
      Text: "A feast is made for laughter, and wine makes the life glad; and money is the answer for all things."
  }, {
      Id: 854,
      Name: "Prosperity",
      Reference: "Hosea 4:7",
      Text: "As they were multiplied, so they sinned against me. I will change their glory into shame."
  }, {
      Id: 855,
      Name: "Prosperity",
      Reference: "1 Peter 1:7",
      Text: "that the proof of your faith, which is more precious than gold that perishes, even though it is tested by fire, may be found to result in praise, glory, and honor at the revelation of Jesus Christ—"
  }, {
      Id: 856,
      Name: "Prosperity",
      Reference: "Hosea 13:6",
      Text: "According to their pasture, so were they filled; they were filled, and their heart was exalted. Therefore they have forgotten me."
  }, {
      Id: 857,
      Name: "Prosperity",
      Reference: "Psalms 127:1",
      Text: "Unless Yahweh builds the house, they who build it labor in vain. Unless Yahweh watches over the city, the watchman guards it in vain."
  }, {
      Id: 858,
      Name: "Prosperity",
      Reference: "Proverbs 28:8",
      Text: "He who increases his wealth by excessive interest gathers it for one who has pity on the poor."
  }, {
      Id: 859,
      Name: "Prosperity",
      Reference: "Psalms 9:18",
      Text: "For the needy shall not always be forgotten,nor the hope of the poor perish forever."
  }, {
      Id: 860,
      Name: "Prosperity",
      Reference: "Exodus 23:25",
      Text: "You shall serve Yahweh your God, and he will bless your bread and your water, and I will take sickness away from among you."
  }, {
      Id: 861,
      Name: "Prosperity",
      Reference: "Mark 11:24",
      Text: " Therefore I tell you, all things whatever you pray and ask for, believe that you have received them, and you shall have them."
  }, {
      Id: 862,
      Name: "Prosperity",
      Reference: "Isaiah 32:17-18",
      Text: "The work of righteousness will be peace, and the effect of righteousness, quietness and confidence forever. My people will live in a peaceful habitation, in safe dwellings, and in quiet resting places,"
  }, {
      Id: 863,
      Name: "Prosperity",
      Reference: "Psalms 39:7",
      Text: "Now, Lord, what do I wait for? My hope is in you."
  },  {
      Id: 865,
      Name: "Prosperity",
      Reference: "Nehemiah 1:11",
      Text: "Lord, I beg you, let your ear be attentive now to the prayer of your servant, and to the prayer of your servants who delight to fear your name; and please prosper your servant today, and grant him mercy in the sight of this man.” Now I was cup bearer to the king."
  }, {
      Id: 866,
      Name: "Prosperity",
      Reference: "1 Chronicles 29:12",
      Text: "Both riches and honor come from you, and you rule over all! In your hand is power and might! It is in your hand to make great, and to give strength to all!"
  }, {
      Id: 867,
      Name: "Prosperity",
      Reference: "Malachi 3:11-12",
      Text: "I will rebuke the devourer for your sakes, and he shall not destroy the fruits of your ground; neither shall your vine cast its fruit before its time in the field,” says Yahweh of Armies. “All nations shall call you blessed, for you will be a delightful land,” says Yahweh of Armies."
  }, {
      Id: 870,
      Name: "Prosperity",
      Reference: "Haggai 2:7",
      Text: "and I will shake all nations. The treasure of all nations will come, and I will fill this house with glory, says Yahweh of Armies."
  }, {
      Id: 871,
      Name: "Prosperity",
      Reference: "Matthew 25:15",
      Text: "To one he gave five talents, to another two, to another one, to each according to his own ability. Then he went on his journey."
  }, {
      Id: 872,
      Name: "Prosperity",
      Reference: "2 Corinthians 8:9",
      Text: "For you know the grace of our Lord Jesus Christ, that though he was rich, yet for your sakes he became poor, that you through his poverty might become rich."
  }, {
      Id: 873,
      Name: "Prosperity",
      Reference: "2 Corinthians 9:8",
      Text: "And God is able to make all grace abound to you, that you, always having all sufficiency in everything, may abound to every good work."
  }, {
      Id: 874,
      Name: "Prosperity",
      Reference: "Psalms 118:1",
      Text: "Give thanks to Yahweh, for he is good, for his loving kindness endures forever."
  }, {
      Id: 875,
      Name: "Prosperity",
      Reference: "2 Chronicles 31:20-21",
      Text: "Hezekiah did so throughout all Judah; and he did that which was good, right, and faithful before Yahweh his God. In every work that he began in the service of God’s house, in the law, and in the commandments, to seek his God, he did it with all his heart and prospered."
  },  {
      Id: 877,
      Name: "Prosperity",
      Reference: "Hosea 6:11",
      Text: "“Also, Judah, there is a harvest appointed for you, when I restore the fortunes of my people."
  }, {
      Id: 878,
      Name: "Prosperity",
      Reference: "Isaiah 35:4",
      Text: "Tell those who have a fearful heart, “Be strong! Don’t be afraid! Behold, your God will come with vengeance, God’s retribution. He will come and save you."
  }, {
      Id: 879,
      Name: "Prosperity",
      Reference: "Proverbs 3:9-19",
      Text: "Honor Yahweh with your substance, with the first fruits of all your increase; so your barns will be filled with plenty, and your vats will overflow with new wine."
  }, {
      Id: 880,
      Name: "Purity",
      Reference: "Matthew 5:8",
      Text: "Blessed are the pure in heart, for they shall see God.",
    Lie: "Real happiness lies in lust."
  }, {
      Id: 881,
      Name: "Purity",
      Reference: "Psalms 119:9",
      Text: "How can a young man keep his way pure? By living according to your word.",
    Lie: "There is no way to live a sexually clean life."
  }, {
      Id: 882,
      Name: "Purity",
      Reference: "1 Timothy 4:12",
      Text: "Let no man despise your youth; but be an example to those who believe, in word, in your way of life, in love, in spirit, in faith, and in purity.",
    Lie: "Young people can't be pure."
  }, {
      Id: 883,
      Name: "Purity",
      Reference: "Hebrews 13:4",
      Text: "Let marriage be held in honor among all, and let the bed be undefiled; but God will judge the sexually immoral and adulterers.",
    Lie: "God will not judge you even when you are in adultery."
  }, {
      Id: 884,
      Name: "Purity",
      Reference: "1 Corinthians 6:18",
      Text: "Flee sexual immorality! “Every sin that a man does is outside the body,” but he who commits sexual immorality sins against his own body."
  }, {
      Id: 885,
      Name: "Purity",
      Reference: "Psalms 51:10",
      Text: "Create in me a clean heart, O God.Renew a right spirit within me."
  }, {
      Id: 886,
      Name: "Purity",
      Reference: "1 Thessalonians 4:3-5",
      Text: "For this is the will of God: your sanctification, that you abstain from sexual immorality, that each one of you know how to control his own body in sanctification and honor, not in the passion of lust, even as the Gentiles who don’t know God,"
  }, {
      Id: 887,
      Name: "Purity",
      Reference: "1 John 1:9",
      Text: "If we confess our sins, he is faithful and righteous to forgive us the sins and to cleanse us from all unrighteousness."
  }, 
   {
      Id: 1378,
      Name: "Purity",
      Reference: "2 Peter 2:1-22",
      Text: "But false prophets also arose among the people, as false teachers will also be among you, who will secretly bring in destructive heresies, denying even the Master who bought them, bringing on themselves swift destruction. Many will follow their immoral ways, and as a result, the way of the truth will be maligned."
  },
  {
      Id: 888,
      Name: "Purity",
      Reference: "Galatians 5:19-21",
      Text: "Now the deeds of the flesh are obvious, which are: adultery, sexual immorality, uncleanness, lustfulness, idolatry, sorcery, hatred, strife, jealousies, outbursts of anger, rivalries, divisions, heresies, envy, murders, drunkenness, orgies, and things like these; of which I forewarn you, even as I also forewarned you, that those who practice such things will not inherit God’s Kingdom."
  }, {
      Id: 889,
      Name: "Purity",
      Reference: "Colossians 3:5",
      Text: "Put to death therefore your members which are on the earth: sexual immorality, uncleanness, depraved passion, evil desire, and covetousness, which is idolatry."
  }, {
      Id: 890,
      Name: "Purity",
      Reference: "Romans 13:14",
      Text: "But put on the Lord Jesus Christ, and make no provision for the flesh, for its lusts."
  }, {
      Id: 891,
      Name: "Purity",
      Reference: "Philippians 4:8",
      Text: "Finally, brothers, whatever things are true, whatever things are honorable, whatever things are just, whatever things are pure, whatever things are lovely, whatever things are of good report: if there is any virtue and if there is anything worthy of praise, think about these things."
  }, {
      Id: 892,
      Name: "Purity",
      Reference: "Psalms 24:3-4",
      Text: "Who may ascend to Yahweh’s hill? Who may stand in his holy place? He who has clean hands and a pure heart; who has not lifted up his soul to falsehood, and has not sworn deceitfully."
  }, {
      Id: 893,
      Name: "Purity",
      Reference: "Ephesians 5:5",
      Text: "Know this for sure, that no sexually immoral person, nor unclean person, nor covetous man ( who is an idolater), has any inheritance in the Kingdom of Christ and God."
  }, {
      Id: 894,
      Name: "Purity",
      Reference: "1 Thessalonians 4:3-8",
      Text: "For this is the will of God: your sanctification, that you abstain from sexual immorality, that each one of you know how to control his own body in sanctification and honor, not in the passion of lust, even as the Gentiles who don’t know God, that no one should take advantage of and wrong a brother or sister in this matter; because the Lord is an avenger in all these things, as also we forewarned you and testified. For God called us not for uncleanness, but in sanctification. Therefore he who rejects this doesn’t reject man, but God, who has also given his Holy Spirit to you."
  }, {
      Id: 895,
      Name: "Purity",
      Reference: "James 4:8",
      Text: "Draw near to God, and he will draw near to you. Cleanse your hands, you sinners. Purify your hearts, you double-minded."
  }, {
      Id: 896,
      Name: "Purity",
      Reference: "Titus 1:15",
      Text: "To the pure, all things are pure, but to those who are defiled and unbelieving, nothing is pure; but both their mind and their conscience are defiled."
  }, {
      Id: 897,
      Name: "Purity",
      Reference: "Titus 2:12",
      Text: "instructing us to the intent that, denying ungodliness and worldly lusts, we would live soberly, righteously, and godly in this present age;"
  }, {
      Id: 898,
      Name: "Purity",
      Reference: "2 Corinthians 6",
      Text: "but in everything commending ourselves as servants of God: in great endurance, in afflictions, in hardships, in distresses, in beatings, in imprisonments, in riots, in labors, in watchings, in fastings, in pureness, in knowledge, in perseverance, in kindness, in the Holy Spirit, in sincere love,"
  }, {
      Id: 899,
      Name: "Purity",
      Reference: "2 Corinthians 7:1",
      Text: "Having therefore these promises, beloved, let’s cleanse ourselves from all defilement of flesh and spirit, perfecting holiness in the fear of God."
  }, {
      Id: 900,
      Name: "Purity",
      Reference: "1 Timothy 5:22",
      Text: "Lay hands hastily on no one. Don’t be a participant in other people’s sins. Keep yourself pure."
  }, {
      Id: 901,
      Name: "Purity",
      Reference: "1 Corinthians 6:13",
      Text: "“Foods for the belly, and the belly for foods,” but God will bring to nothing both it and them. But the body is not for sexual immorality, but for the Lord, and the Lord for the body."
  }, {
      Id: 902,
      Name: "Purity",
      Reference: "Hebrews 13:18",
      Text: "Pray for us, for we are persuaded that we have a good conscience, desiring to live honorably in all things."
  }, {
      Id: 903,
      Name: "Purity",
      Reference: "Psalms 119:37",
      Text: "Turn my eyes away from looking at worthless things. Revive me in your ways."
  }, {
      Id: 904,
      Name: "Purity",
      Reference: "Ephesians 5:3",
      Text: "But sexual immorality, and all uncleanness or covetousness, let it not even be mentioned among you, as becomes saints;"
  }, {
      Id: 905,
      Name: "Purity",
      Reference: "Titus 2:5",
      Text: "to be sober minded, chaste, workers at home, kind, being in subjection to their own husbands, that God’s word may not be blasphemed."
  }, {
      Id: 906,
      Name: "Purity",
      Reference: "1 Corinthians 7:2",
      Text: "But, because of sexual immoralities, let each man have his own wife, and let each woman have her own husband."
  }, {
      Id: 907,
      Name: "Purity",
      Reference: "Habakkuk 1:13",
      Text: "You who have purer eyes than to see evil, and who cannot look on perversity, why do you tolerate those who deal treacherously and keep silent when the wicked swallows up the man who is more righteous than he,"
  }, {
      Id: 908,
      Name: "Purity",
      Reference: "John 8:34",
      Text: "Jesus answered them,“Most certainly I tell you, everyone who commits sin is the bondservant of sin."
  }, {
      Id: 909,
      Name: "Purity",
      Reference: "Luke 11:34-35",
      Text: "The lamp of the body is the eye. Therefore when your eye is good, your whole body is also full of light; but when it is evil, your body also is full of darkness. Therefore see whether the light that is in you isn’t darkness."
  }, {
      Id: 910,
      Name: "Purity",
      Reference: "1 Corinthians 6:9-10",
      Text: "Or don’t you know that the unrighteous will not inherit God’s Kingdom? Don’t be deceived. Neither the sexually immoral, nor idolaters, nor adulterers, nor male prostitutes, nor homosexuals, nor thieves, nor covetous, nor drunkards, nor slanderers, nor extortionists, will inherit God’s Kingdom."
  }, {
      Id: 911,
      Name: "Purity",
      Reference: "James 1:27",
      Text: "Pure religion and undefiled before our God and Father is this: to visit the fatherless and widows in their affliction, and to keep oneself unstained by the world."
  }, {
      Id: 912,
      Name: "Purity",
      Reference: "Colossians 3:1-3",
      Text: "If then you were raised together with Christ, seek the things that are above, where Christ is, seated on the right hand of God. Set your mind on the things that are above, not on the things that are on the earth. For you died, and your life is hidden with Christ in God."
  }, {
      Id: 913,
      Name: "Purity",
      Reference: "Galatians 2:20",
      Text: "I have been crucified with Christ, and it is no longer I who live, but Christ lives in me. That life which I now live in the flesh, I live by faith in the Son of God, who loved me and gave himself up for me."
  }, {
      Id: 914,
      Name: "Purity",
      Reference: "Job 31:1",
      Text: "“I made a covenant with my eyes"
  }, {
      Id: 915,
      Name: "Purity",
      Reference: "2 Corinthians 11:2",
      Text: "For I am jealous over you with a godly jealousy. For I promised you in marriage to one husband, that I might present you as a pure virgin to Christ."
  }, {
      Id: 916,
      Name: "Purity",
      Reference: "Psalms 73:1",
      Text: "Surely God is good to Israel, to those who are pure in heart."
  },  {
      Id: 918,
      Name: "Purity",
      Reference: "2 Corinthians 10:3-5",
      Text: "For though we walk in the flesh, we don’t wage war according to the flesh; for the weapons of our warfare are not of the flesh, but mighty before God to the throwing down of strongholds, throwing down imaginations and every high thing that is exalted against the knowledge of God and bringing every thought into captivity to the obedience of Christ,"
  }, {
      Id: 919,
      Name: "Purity",
      Reference: "2 Corinthians 6:6",
      Text: "in pureness, in knowledge, in perseverance, in kindness, in the Holy Spirit, in sincere love,"
  }, {
      Id: 920,
      Name: "Purity",
      Reference: "Hebrews 9:14",
      Text: "how much more will the blood of Christ, who through the eternal Spirit offered himself without defect to God, cleanse your conscience from dead works to serve the living God?"
  }, {
      Id: 921,
      Name: "Purity",
      Reference: "Romans 8:7",
      Text: "because the mind of the flesh is hostile toward God, for it is not subject to God’s law, neither indeed can it be."
  }, {
      Id: 922,
      Name: "Purity",
      Reference: "Proverbs 6:32",
      Text: "He who commits adultery with a woman is void of understanding. He who does it destroys his own soul."
  }, {
      Id: 923,
      Name: "Purity",
      Reference: "Genesis 2:24",
      Text: "Therefore a man will leave his father and his mother, and will join with his wife, and they will be one flesh."
  }, {
      Id: 924,
      Name: "Purity",
      Reference: "Exodus 20:14",
      Text: "“You shall not commit adultery."
  }, {
      Id: 925,
      Name: "Purity",
      Reference: "Proverbs 1:7",
      Text: "The fear of the LORD is the beginning of knowledge, but the foolish despise wisdom and instruction."
  }, {
      Id: 926,
      Name: "Purity",
      Reference: "Proverbs 7:2",
      Text: "Keep my commandments and live! Guard my teaching as the apple of your eye."
  }, {
      Id: 927,
      Name: "Purity",
      Reference: "Psalms 24:3-5",
      Text: "Who may ascend to Yahweh’s hill? Who may stand in his holy place? He who has clean hands and a pure heart; who has not lifted up his soul to falsehood, and has not sworn deceitfully. He shall receive a blessing from Yahweh, righteousness from the God of his salvation."
  }, {
      Id: 928,
      Name: "Purity",
      Reference: "1 Timothy 6:11",
      Text: "But you, man of God, flee these things, and follow after righteousness, godliness, faith, love, perseverance, and gentleness."
  }, {
      Id: 929,
      Name: "Purity",
      Reference: "Romans 6:11-14",
      Text: "Thus consider yourselves also to be dead to sin, but alive to God in Christ Jesus our Lord. Therefore don’t let sin reign in your mortal body, that you should obey it in its lusts. Also, do not present your members to sin as instruments of unrighteousness, but present yourselves to God as alive from the dead, and your members as instruments of righteousness to God. For sin will not have dominion over you, for you are not under law, but under grace."
  }, {
      Id: 930,
      Name: "Purity",
      Reference: "Matthew 5:23-24",
      Text: "“If therefore you are offering your gift at the altar, and there remember that your brother has anything against you, leave your gift there before the altar, and go your way. First be reconciled to your brother, and then come and offer your gift."
  }, {
      Id: 931,
      Name: "Purity",
      Reference: "1 Peter 1:22",
      Text: "Seeing you have purified your souls in your obedience to the truth through the Spirit in sincere brotherly affection, love one another from the heart fervently,"
  }, {
      Id: 932,
      Name: "Purity",
      Reference: "Hebrews 12:14",
      Text: "Follow after peace with all men, and the sanctification without which no man will see the Lord,"
  }, {
      Id: 933,
      Name: "Purity",
      Reference: "Titus 3:8",
      Text: "This saying is faithful, and concerning these things I desire that you insist confidently, so that those who have believed God may be careful to maintain good works. These things are good and profitable to men;"
  }, {
      Id: 934,
      Name: "Purity",
      Reference: "James 3:2",
      Text: "For we all stumble in many things. Anyone who doesn’t stumble in word is a perfect person, able to bridle the whole body also."
  }, {
      Id: 935,
      Name: "Purity",
      Reference: "Galatians 6:7-8",
      Text: "Don’t be deceived. God is not mocked, for whatever a man sows, that he will also reap. For he who sows to his own flesh will from the flesh reap corruption. But he who sows to the Spirit will from the Spirit reap eternal life."
  }, {
      Id: 936,
      Name: "Purity",
      Reference: "Psalms 18:26",
      Text: "With the pure, you will show yourself pure. With the crooked you will show yourself shrewd."
  }, {
      Id: 937,
      Name: "Purity",
      Reference: "1 Chronicles 16:11",
      Text: "Seek Yahweh and his strength. Seek his face forever more."
  }, {
      Id: 938,
      Name: "Purity",
      Reference: "Leviticus 18:30",
      Text: "Therefore you shall keep my requirements, that you do not practice any of these abominable customs which were practiced before you, and that you do not defile yourselves with them. I am Yahweh your God.’”"
  }, {
      Id: 939,
      Name: "Purity",
      Reference: "Leviticus 11:45",
      Text: "For I am Yahweh who brought you up out of the land of Egypt, to be your God. You shall therefore be holy, for I am holy."
  }, {
      Id: 940,
      Name: "Purity",
      Reference: "Isaiah 59:2",
      Text: "But your iniquities have separated you and your God, and your sins have hidden his face from you, so that he will not hear."
  }, {
      Id: 941,
      Name: "Purity",
      Reference: "Isaiah 52:1-15",
      Text: "Awake, awake! Put on your strength, Zion. Put on your beautiful garments, Jerusalem, the holy city, for from now on the uncircumcised and the unclean will no more come into you."
  }, {
      Id: 942,
      Name: "Purity",
      Reference: "Titus 3:5",
      Text: "not by works of righteousness which we did ourselves, but according to his mercy, he saved us through the washing of regeneration and renewing by the Holy Spirit,"
  }, {
      Id: 943,
      Name: "Purity",
      Reference: "1 Thessalonians 4",
      Text: "For this is the will of God: your sanctification, that you abstain from sexual immorality, that each one of you know how to control his own body in sanctification and honor, not in the passion of lust, even as the Gentiles who don’t know God,"
  }, {
      Id: 944,
      Name: "Purity",
      Reference: "1 Thessalonians 5:8",
      Text: "But since we belong to the day, let’s be sober, putting on the breastplate of faith and love, and for a helmet, the hope of salvation."
  }, {
      Id: 945,
      Name: "Purity",
      Reference: "Hebrews 12:1",
      Text: "Therefore let’s also, seeing we are surrounded by so great a cloud of witnesses, lay aside every weight and the sin which so easily entangles us, and let’s run with perseverance the race that is set before us,"
  }, {
      Id: 946,
      Name: "Purity",
      Reference: "Hebrews 13:4-5",
      Text: "Let marriage be held in honor among all, and let the bed be undefiled; but God will judge the sexually immoral and adulterers. Be free from the love of money, content with such things as you have, for he has said, “I will in no way leave you, neither will I in any way forsake you.”"
  }, {
      Id: 947,
      Name: "Purity",
      Reference: "Colossians 1:12",
      Text: "giving thanks to the Father, who made us fit to be partakers of the inheritance of the saints in light,"
  }, {
      Id: 948,
      Name: "Purity",
      Reference: "Colossians 2:6-7",
      Text: "As therefore you received Christ Jesus the Lord, walk in him, rooted and built up in him and established in the faith, even as you were taught, abounding in it in thanksgiving."
  }, {
      Id: 949,
      Name: "Purity",
      Reference: "Philippians 1:6",
      Text: "being confident of this very thing, that he who began a good work in you will complete it until the day of Jesus Christ."
  }, {
      Id: 950,
      Name: "Purity",
      Reference: "1 Corinthians 3:16-17",
      Text: "Don’t you know that you are God’s temple and that God’s Spirit lives in you? If anyone destroys God’s temple, God will destroy him; for God’s temple is holy, which you are."
  }, {
      Id: 951,
      Name: "Purity",
      Reference: "1 Corinthians 4:4-5",
      Text: "For I know nothing against myself. Yet I am not justified by this, but he who judges me is the Lord. Therefore judge nothing before the time, until the Lord comes, who will both bring to light the hidden things of darkness and reveal the counsels of the hearts. Then each man will get his praise from God."
  }, {
      Id: 952,
      Name: "Purity",
      Reference: "1 Corinthians 5:11",
      Text: "But as it is, I wrote to you not to associate with anyone who is called a brother who is a sexual sinner, or covetous, or an idolater, or a slanderer, or a drunkard, or an extortionist. Don’t even eat with such a person."
  }, {
      Id: 953,
      Name: "Purity",
      Reference: "1 Corinthians 6:9-10",
      Text: "Or don’t you know that the unrighteous will not inherit God’s Kingdom? Don’t be deceived. Neither the sexually immoral, nor idolaters, nor adulterers, nor male prostitutes, nor homosexuals, nor thieves, nor covetous, nor drunkards, nor slanderers, nor extortionists, will inherit God’s Kingdom."
  }, {
      Id: 954,
      Name: "Purity",
      Reference: "Ezekiel 36:25-27",
      Text: "I will sprinkle clean water on you, and you will be clean. I will cleanse you from all your filthiness and from all your idols. I will also give you a new heart, and I will put a new spirit within you. I will take away the stony heart out of your flesh, and I will give you a heart of flesh. I will put my Spirit within you, and cause you to walk in my statutes. You will keep my ordinances and do them."
  }, {
      Id: 955,
      Name: "Purity",
      Reference: "Jeremiah 4:14",
      Text: "Jerusalem, wash your heart from wickedness, that you may be saved. How long will your evil thoughts lodge within you?"
  }, {
      Id: 956,
      Name: "Purity",
      Reference: "Isaiah 1:16-17",
      Text: "Wash yourselves. Make yourself clean. Put away the evil of your doings from before my eyes. Cease to do evil. Learn to do well. Seek justice.Relieve the oppressed. Defend the fatherless. Plead for the widow.”"
  }, {
      Id: 957,
      Name: "Purity",
      Reference: "Proverbs 15:24",
      Text: "The path of life leads upward for the wise, to keep him from going downward to Sheol."
  }, {
      Id: 958,
      Name: "Purity",
      Reference: "Proverbs 16:1-7",
      Text: "All the ways of a man are clean in his own eyes, but Yahweh weighs the motives."
  }, {
      Id: 959,
      Name: "Purity",
      Reference: "Psalms 119:9-11",
      Text: "How can a young man keep his way pure?By living according to your word. With my whole heart I have sought you. Don’t let me wander from your commandments. I have hidden your word in my heart, that I might not sin against you."
  }, {
      Id: 960,
      Name: "Purity",
      Reference: "Psalms 86:11",
      Text: "Teach me your way, Yahweh. I will walk in your truth. Make my heart undivided to fear your name."
  }, {
      Id: 961,
      Name: "Purity",
      Reference: "2 Timothy 2:4",
      Text: "No soldier on duty entangles himself in the affairs of life, that he may please him who enrolled him as a soldier."
  }, {
      Id: 962,
      Name: "Purity",
      Reference: "Colossians 4:6",
      Text: "Let your speech always be with grace, seasoned with salt, that you may know how you ought to answer each one."
  }, {
      Id: 963,
      Name: "Purity",
      Reference: "Galatians 5:24",
      Text: "Those who belong to Christ have crucified the flesh with its passions and lusts."
  }, {
      Id: 964,
      Name: "Purity",
      Reference: "Romans 12",
      Text: "Therefore I urge you, brothers, by the mercies of God, to present your bodies a living sacrifice, holy, acceptable to God, which is your spiritual service."
  }, {
      Id: 965,
      Name: "Purity",
      Reference: "Romans 13",
      Text: "Let’s walk properly, as in the day; not in reveling and drunkenness, not in sexual promiscuity and lustful acts, and not in strife and jealousy. But put on the Lord Jesus Christ, and make no provision for the flesh, for its lusts."
  }, {
      Id: 966,
      Name: "Purity",
      Reference: "Romans 14:1-19",
      Text: "For if we live, we live to the Lord. Or if we die, we die to the Lord. If therefore we live or die, we are the Lord’s."
  }, {
      Id: 967,
      Name: "Purity",
      Reference: "Romans 10:13",
      Text: "For, “Whoever will call on the name of the Lord will be saved.”"
  }, {
      Id: 968,
      Name: "Purity",
      Reference: "Romans 11:27",
      Text: "This is my covenant with them, when I will take away their sins.”"
  }, {
      Id: 969,
      Name: "Purity",
      Reference: "Acts 15:29",
      Text: "that you abstain from things sacrificed to idols, from blood, from things strangled, and from sexual immorality, from which if you keep yourselves, it will be well with you. Farewell.”"
  }, {
      Id: 970,
      Name: "Purity",
      Reference: "Matthew 23:12",
      Text: "Whoever exalts himself will be humbled, and whoever humbles himself will be exalted."
  }, {
      Id: 971,
      Name: "Purity",
      Reference: "Ezekiel 39:24",
      Text: "I did to them according to their uncleanness and according to their transgressions. I hid my face from them."
  }, {
      Id: 972,
      Name: "Purity",
      Reference: "Ecclesiastes 7:26",
      Text: "I find more bitter than death the woman whose heart is snares and traps, whose hands are chains. Whoever pleases God shall escape from her; but the sinner will be ensnared by her."
  }, {
      Id: 973,
      Name: "Purity",
      Reference: "Proverbs 11:20",
      Text: "Those who are perverse in heart are an abomination to Yahweh, but those whose ways are blameless are his delight."
  }, {
      Id: 974,
      Name: "Purity",
      Reference: "Proverbs 4:4-5",
      Text: "He taught me, and said to me:“Let your heart retain my words. Keep my commandments, and live. Get wisdom. Get understanding. Don’t forget, and don’t deviate from the words of my mouth."
  }, {
      Id: 975,
      Name: "Purity",
      Reference: "Psalms 84:11",
      Text: "For Yahweh God is a sun and a shield.Yahweh will give grace and glory. He withholds no good thing from those who walk blamelessly."
  }, {
      Id: 976,
      Name: "Purity",
      Reference: "Psalms 50:23",
      Text: "Whoever offers the sacrifice of thanksgiving glorifies me, and prepares his way so that I will show God’s salvation to him.”"
  }, {
      Id: 977,
      Name: "Purity",
      Reference: "Psalms 51:7",
      Text: "Purify me with hyssop, and I will be clean.Wash me, and I will be whiter than snow."
  }, {
      Id: 978,
      Name: "Purity",
      Reference: "Psalms 34:7",
      Text: "Yahweh’s angel encamps around those who fear him, and delivers them."
  }, {
      Id: 979,
      Name: "Purity",
      Reference: "Psalms 5:1",
      Text: "Give ear to my words, Yahweh.Consider my meditation."
  }, {
      Id: 980,
      Name: "Purity",
      Reference: "Hebrews 8:10",
      Text: "“For this is the covenant that I will make with the house of Israel after those days,” says the Lord:“I will put my laws into their mind; I will also write them on their heart. I will be their God, and they will be my people."
  }, {
      Id: 981,
      Name: "Purity",
      Reference: "Isaiah 6:5",
      Text: "Then I said, “Woe is me! For I am undone, because I am a man of unclean lips and I live among a people of unclean lips, for my eyes have seen the King, Yahweh of Armies!”"
  }, {
      Id: 982,
      Name: "Humility",
      Reference: "Proverbs 22:4",
      Text: "The result of humility and the fear of the LORD is wealth, honor, and life.",
    Lie: "God is against you having wealth and honor"
  }, {
      Id: 983,
      Name: "Humility",
      Reference: "Proverbs 11:2",
      Text: "When pride comes, then comes shame, but with humility comes wisdom.",
    Lie: "You made yourself successful."
  }, {
      Id: 984,
      Name: "Humility",
      Reference: "Colossians 3:12",
      Text: "Put on therefore, as God’s chosen ones, holy and beloved, a heart of compassion, kindness, lowliness, humility, and perseverance",
    Lie: "No need to be kind. No need to be humble."
  }, {
      Id: 985,
      Name: "Humility",
      Reference: "1 Peter 5:5",
      Text: "Likewise, you younger ones, be subject to the elder. Yes, all of you clothe yourselves with humility and subject yourselves to one another; for “God resists the proud, but gives grace to the humble.”",
    Lie: "You can go your own way."
  }, {
      Id: 986,
      Name: "Humility",
      Reference: "James 4:10",
      Text: "Humble yourselves in the sight of the Lord, and he will exalt you.",
    Lie: "If you humble yourself you will be despised."
  }, {
      Id: 987,
      Name: "Humility",
      Reference: "James 4:6",
      Text: "But he gives more grace. Therefore it says, “God resists the proud, but gives grace to the humble.”",
    Lie: "God has nothing more for you."
  }, {
      Id: 988,
      Name: "Humility",
      Reference: "Ephesians 4:2",
      Text: "with all lowliness and humility, with patience, bearing with one another in love"
  }, {
      Id: 989,
      Name: "Humility",
      Reference: "Micah 6:8",
      Text: "He has shown you, O man, what is good. What does Yahweh require of you, but to act justly, to love mercy, and to walk humbly with your God?"
  }, {
      Id: 990,
      Name: "Humility",
      Reference: "Proverbs 15:33",
      Text: "The fear of Yahweh teaches wisdom. Before honor is humility."
  }, {
      Id: 991,
      Name: "Humility",
      Reference: "Proverbs 18:12",
      Text: "Before destruction the heart of man is proud, but before honor is humility."
  }, {
      Id: 992,
      Name: "Humility",
      Reference: "2 Chronicles 7:14",
      Text: "if my people who are called by my name will humble themselves, pray, seek my face, and turn from their wicked ways, then I will hear from heaven, will forgive their sin, and will heal their land."
  }, {
      Id: 993,
      Name: "Humility",
      Reference: "1 Peter 5:6",
      Text: "Humble yourselves therefore under the mighty hand of God, that he may exalt you in due time,"
  }, {
      Id: 994,
      Name: "Humility",
      Reference: "Luke 14:11",
      Text: "For everyone who exalts himself will be humbled, and whoever humbles himself will be exalted.”"
  }, {
      Id: 995,
      Name: "Humility",
      Reference: "Philippians 2:3",
      Text: "doing nothing through rivalry or through conceit, but in humility, each counting others better than himself;"
  }, {
      Id: 996,
      Name: "Humility",
      Reference: "Romans 12:3",
      Text: "For I say through the grace that was given me, to everyone who is among you, not to think of yourself more highly than you ought to think; but to think reasonably, as God has apportioned to each person a measure of faith."
  }, {
      Id: 997,
      Name: "Humility",
      Reference: "Romans 12:16",
      Text: "Be of the same mind one toward another. Don’t set your mind on high things, but associate with the humble. Don’t be wise in your own conceits."
  }, {
      Id: 998,
      Name: "Humility",
      Reference: "Proverbs 3:34",
      Text: "Surely he mocks the mockers, but he gives grace to the humble."
  }, {
      Id: 999,
      Name: "Humility",
      Reference: "Proverbs 29:23",
      Text: "A man’s pride brings him low, but one of lowly spirit gains honor."
  }, {
      Id: 1000,
      Name: "Humility",
      Reference: "James 3:13",
      Text: "Who is wise and understanding among you? Let him show by his good conduct that his deeds are done in gentleness of wisdom."
  }, {
      Id: 1001,
      Name: "Humility",
      Reference: "Psalms 25:9",
      Text: "He will guide the humble in justice.He will teach the humble his way."
  }, {
      Id: 1002,
      Name: "Humility",
      Reference: "Matthew 23:12",
      Text: "Whoever exalts himself will be humbled, and whoever humbles himself will be exalted."
  }, {
      Id: 1003,
      Name: "Humility",
      Reference: "Psalms 149:4",
      Text: "For Yahweh takes pleasure in his people. He crowns the humble with salvation."
  }, {
      Id: 1004,
      Name: "Humility",
      Reference: "Isaiah 57:15",
      Text: "For the high and lofty One who inhabits eternity, whose name is Holy, says:“I dwell in the high and holy place, with him also who is of a contrite and humble spirit, to revive the spirit of the humble, and to revive the heart of the contrite."
  }, {
      Id: 1005,
      Name: "Humility",
      Reference: "Philippians 2:3",
      Text: "doing nothing through rivalry or through conceit, but in humility, each counting others better than himself; "
  }, {
      Id: 1006,
      Name: "Humility",
      Reference: "Matthew 11:29",
      Text: "Take my yoke upon you and learn from me, for I am gentle and humble in heart; and you will find rest for your souls."
  }, {
      Id: 1007,
      Name: "Humility",
      Reference: "John 3:30",
      Text: "He must increase, but I must decrease."
  }, {
      Id: 1008,
      Name: "Humility",
      Reference: "1 Peter 3:8",
      Text: "Finally, all of you be like-minded, compassionate, loving as brothers, tenderhearted, courteous,"
  }, {
      Id: 1009,
      Name: "Humility",
      Reference: "Isaiah 66:2",
      Text: "For my hand has made all these things, and so all these things came to be,” says Yahweh:“but I will look to this man, even to he who is poor and of a contrite spirit, and who trembles at my word."
  }, {
      Id: 1010,
      Name: "Humility",
      Reference: "Zephaniah 2:3",
      Text: "Seek Yahweh, all you humble of the land, who have kept his ordinances. Seek righteousness. Seek humility. It may be that you will be hidden in the day of Yahweh’s anger."
  }, {
      Id: 1011,
      Name: "Humility",
      Reference: "Matthew 5:3",
      Text: "“Blessed are the poor in spirit, for theirs is the Kingdom of Heaven."
  }, {
      Id: 1012,
      Name: "Humility",
      Reference: "Mark 9:35",
      Text: "He sat down and called the twelve; and he said to them,“If any man wants to be first, he shall be last of all, and servant of all.”"
  }, {
      Id: 1013,
      Name: "Humility",
      Reference: "Psalms 147:6",
      Text: "Yahweh upholds the humble. He brings the wicked down to the ground."
  }, {
      Id: 1014,
      Name: "Humility",
      Reference: "Matthew 23:10-12",
      Text: "Neither be called masters, for one is your master, the Christ. But he who is greatest among you will be your servant. Whoever exalts himself will be humbled, and whoever humbles himself will be exalted."
  }, {
      Id: 1015,
      Name: "Humility",
      Reference: "Jeremiah 9:23",
      Text: "Yahweh says,“Don’t let the wise man glory in his wisdom.Don’t let the mighty man glory in his might.Don’t let the rich man glory in his riches."
  }, {
      Id: 1016,
      Name: "Humility",
      Reference: "Job 22:29",
      Text: "When they cast down, you will say, ‘be lifted up.’ He will save the humble person."
  }, {
      Id: 1017,
      Name: "Humility",
      Reference: "Proverbs 16:19",
      Text: "It is better to be of a lowly spirit with the poor, than to divide the plunder with the proud."
  }, {
      Id: 1018,
      Name: "Humility",
      Reference: "Deuteronomy 8:2-3",
      Text: "You shall remember all the way which Yahweh your God has led you these forty years in the wilderness, that he might humble you, to test you, to know what was in your heart, whether you would keep his commandments or not. He humbled you, allowed you to be hungry, and fed you with manna, which you didn’t know, neither did your fathers know, that he might teach you that man does not live by bread only, but man lives by every word that proceeds out of Yahweh’s mouth."
  }, {
      Id: 1019,
      Name: "Humility",
      Reference: "Psalms 138:6",
      Text: "For though Yahweh is high, yet he looks after the lowly; but he knows the proud from afar."
  }, {
      Id: 1020,
      Name: "Humility",
      Reference: "Proverbs 27:2",
      Text: "Let another man praise you, and not your own mouth; a stranger, and not your own lips."
  }, {
      Id: 1021,
      Name: "Humility",
      Reference: "1 Kings 21:29",
      Text: "“See how Ahab humbles himself before me? Because he humbles himself before me, I will not bring the evil in his days; but I will bring the evil on his house in his son’s day.”"
  }, {
      Id: 1022,
      Name: "Humility",
      Reference: "Mark 10:45",
      Text: "For the Son of Man also came not to be served but to serve, and to give his life as a ransom for many.”"
  }, {
      Id: 1023,
      Name: "Humility",
      Reference: "1 Peter 5:5-6",
      Text: "Likewise, you younger ones, be subject to the elder. Yes, all of you clothe yourselves with humility and subject yourselves to one another; for “God resists the proud, but gives grace to the humble.” Humble yourselves therefore under the mighty hand of God, that he may exalt you in due time,"
  }, {
      Id: 1024,
      Name: "Humility",
      Reference: "1 Corinthians 1:28-29",
      Text: "God chose the lowly things of the world, and the things that are despised, and the things that don’t exist, that he might bring to nothing the things that exist, that no flesh should boast before God."
  }, {
      Id: 1025,
      Name: "Humility",
      Reference: "2 Chronicles 34:27",
      Text: "because your heart was tender, and you humbled yourself before God when you heard his words against this place and against its inhabitants, and have humbled yourself before me, and have torn your clothes and wept before me, I also have heard you,” says Yahweh."
  }, {
      Id: 1026,
      Name: "Humility",
      Reference: "Matthew 18:4",
      Text: "Whoever therefore humbles himself as this little child is the greatest in the Kingdom of Heaven."
  }, {
      Id: 1027,
      Name: "Humility",
      Reference: "Matthew 11:29-30",
      Text: "Take my yoke upon you and learn from me, for I am gentle and humble in heart; and you will find rest for your souls. For my yoke is easy, and my burden is light.”"
  }, {
      Id: 1028,
      Name: "Humility",
      Reference: "Numbers 12:3",
      Text: "Now the man Moses was very humble, more than all the men who were on the surface of the earth."
  }, {
      Id: 1029,
      Name: "Humility",
      Reference: "Romans 11:18",
      Text: "don’t boast over the branches. But if you boast, remember that it is not you who support the root, but the root supports you."
  }, {
      Id: 1030,
      Name: "Humility",
      Reference: "Luke 1:52",
      Text: "He has put down princes from their thrones, and has exalted the lowly."
  }, {
      Id: 1031,
      Name: "Humility",
      Reference: "1 Peter 3:3-4",
      Text: "Let your beauty come not from the outward adorning of braiding your hair, and of wearing gold ornaments or of putting on fine clothing, but from the hidden person of the heart, in the incorruptible adornment of a gentle and quiet spirit, which is very precious in God’s sight."
  }, {
      Id: 1032,
      Name: "Humility",
      Reference: "Luke 9:48",
      Text: "and said to them,“Whoever receives this little child in my name receives me. Whoever receives me receives him who sent me. For whoever is least among you all, this one will be great.”"
  }, {
      Id: 1033,
      Name: "Humility",
      Reference: "Daniel 4:37",
      Text: "Now I, Nebuchadnezzar, praise and extol and honor the King of heaven; for all his works are truth, and his ways justice; and those who walk in pride he is able to abase."
  }, {
      Id: 1034,
      Name: "Humility",
      Reference: "Matthew 6:2",
      Text: "Therefore, when you do merciful deeds, don’t sound a trumpet before yourself, as the hypocrites do in the synagogues and in the streets, that they may get glory from men. Most certainly I tell you, they have received their reward."
  }, {
      Id: 1035,
      Name: "Humility",
      Reference: "Proverbs 12:15",
      Text: "The way of a fool is right in his own eyes, but he who is wise listens to counsel."
  }, {
      Id: 1036,
      Name: "Humility",
      Reference: "Philippians 2:5",
      Text: "Have this in your mind, which was also in Christ Jesus,"
  }, {
      Id: 1037,
      Name: "Humility",
      Reference: "Psalms 18:27",
      Text: "For you will save the afflicted people, but the arrogant eyes you will bring down."
  }, {
      Id: 1038,
      Name: "Humility",
      Reference: "Colossians 3:18-19",
      Text: "Wives, be in subjection to your husbands, as is fitting in the Lord. Husbands, love your wives, and don’t be bitter against them."
  }, {
      Id: 1039,
      Name: "Humility",
      Reference: "Psalms 25:8-9",
      Text: "Good and upright is Yahweh, therefore he will instruct sinners in the way. He will guide the humble in justice.He will teach the humble his way."
  }, {
      Id: 1040,
      Name: "Humility",
      Reference: "Matthew 20:26-27",
      Text: "It shall not be so among you; but whoever desires to become great among you shall be your servant. Whoever desires to be first among you shall be your bondservant,"
  }, {
      Id: 1041,
      Name: "Humility",
      Reference: "Exodus 10:3",
      Text: "Moses and Aaron went in to Pharaoh, and said to him, “This is what Yahweh, the God of the Hebrews, says: ‘How long will you refuse to humble yourself before me? Let my people go, that they may serve me."
  }, {
      Id: 1042,
      Name: "Humility",
      Reference: "Zechariah 9:9",
      Text: "Rejoice greatly, daughter of Zion! Shout, daughter of Jerusalem! Behold, your King comes to you! He is righteous, and having salvation; lowly, and riding on a donkey, even on a colt, the foal of a donkey."
  }, {
      Id: 1043,
      Name: "Humility",
      Reference: "Galatians 5:13",
      Text: "For you, brothers, were called for freedom. Only don’t use your freedom as an opportunity for the flesh, but through love be servants to one another."
  }, {
      Id: 1044,
      Name: "Humility",
      Reference: "2 Samuel 22:28",
      Text: "You will save the afflicted people, but your eyes are on the arrogant, that you may bring them down."
  }, {
      Id: 1045,
      Name: "Humility",
      Reference: "Philippians 2:8",
      Text: "And being found in human form, he humbled himself, becoming obedient to the point of death, yes, the death of the cross."
  }, {
      Id: 1046,
      Name: "Humility",
      Reference: "Proverbs 8:13",
      Text: "The fear of Yahweh is to hate evil. I hate pride, arrogance, the evil way, and the perverse mouth."
  }, {
      Id: 1047,
      Name: "Humility",
      Reference: "1 Corinthians 15:9",
      Text: "For I am the least of the apostles, who is not worthy to be called an apostle, because I persecuted the assembly of God."
  }, {
      Id: 1048,
      Name: "Humility",
      Reference: "James 3:2",
      Text: "For we all stumble in many things. Anyone who doesn’t stumble in word is a perfect person, able to bridle the whole body also."
  }, {
      Id: 1049,
      Name: "Humility",
      Reference: "1 Corinthians 1:28",
      Text: "God chose the lowly things of the world, and the things that are despised, and the things that don’t exist, that he might bring to nothing the things that exist,"
  }, {
      Id: 1050,
      Name: "Humility",
      Reference: "Genesis 41:16",
      Text: "Joseph answered Pharaoh, saying, “It isn’t in me. God will give Pharaoh an answer of peace.”"
  }, {
      Id: 1051,
      Name: "Humility",
      Reference: "Philippians 4:20",
      Text: "Now to our God and Father be the glory forever and ever! Amen."
  }, {
      Id: 1052,
      Name: "Humility",
      Reference: "Romans 12:10",
      Text: "In love of the brothers be tenderly affectionate to one another; in honor prefer one another,"
  }, {
      Id: 1053,
      Name: "Humility",
      Reference: "Matthew 18:1-4",
      Text: "and said,“Most certainly I tell you, unless you turn and become as little children, you will in no way enter into the Kingdom of Heaven. Whoever therefore humbles himself as this little child is the greatest in the Kingdom of Heaven."
  }, {
      Id: 1054,
      Name: "Humility",
      Reference: "Proverbs 13:10",
      Text: "Pride only breeds quarrels, but wisdom is with people who take advice."
  }, {
      Id: 1055,
      Name: "Humility",
      Reference: "Titus 3:2",
      Text: "to speak evil of no one, not to be contentious, to be gentle, showing all humility toward all men."
  }, {
      Id: 1056,
      Name: "Humility",
      Reference: "2 Corinthians 10:1",
      Text: "Now I Paul, myself, entreat you by the humility and gentleness of Christ, I who in your presence am lowly among you, but being absent am bold toward you."
  }, {
      Id: 1057,
      Name: "Humility",
      Reference: "Ephesians 4:1-3",
      Text: "I therefore, the prisoner in the Lord, beg you to walk worthily of the calling with which you were called, with all lowliness and humility, with patience, bearing with one another in love, being eager to keep the unity of the Spirit in the bond of peace."
  }, {
      Id: 1058,
      Name: "Humility",
      Reference: "Psalms 131:1",
      Text: "Yahweh, my heart isn’t arrogant, nor my eyes lofty; nor do I concern myself with great matters, or things too wonderful for me."
  }, {
      Id: 1059,
      Name: "Humility",
      Reference: "Jeremiah 10:23",
      Text: "Yahweh, I know that the way of man is not in himself. It is not in man who walks to direct his steps."
  }, {
      Id: 1060,
      Name: "Humility",
      Reference: "Psalms 37:11",
      Text: "But the humble shall inherit the land, and shall delight themselves in the abundance of peace."
  }, {
      Id: 1061,
      Name: "Humility",
      Reference: "Acts 20:19",
      Text: "serving the Lord with all humility, with many tears, and with trials which happened to me by the plots of the Jews;"
  }, {
      Id: 1062,
      Name: "Humility",
      Reference: "Colossians 2:23",
      Text: "These things indeed appear like wisdom in self-imposed worship, humility, and severity to the body, but aren’t of any value against the indulgence of the flesh."
  }, {
      Id: 1063,
      Name: "Humility",
      Reference: "2 Corinthians 11:30",
      Text: "If I must boast, I will boast of the things that concern my weakness."
  }, {
      Id: 1064,
      Name: "Humility",
      Reference: "1 Corinthians 13:4",
      Text: "Love is patient and is kind. Love doesn’t envy. Love doesn’t brag, is not proud,"
  }, {
      Id: 1065,
      Name: "Humility",
      Reference: "Luke 18:14",
      Text: "I tell you, this man went down to his house justified rather than the other; for everyone who exalts himself will be humbled, but he who humbles himself will be exalted.”"
  }, {
      Id: 1066,
      Name: "Humility",
      Reference: "Proverbs 16:18-19",
      Text: "Pride goes before destruction, and an arrogant spirit before a fall. It is better to be of a lowly spirit with the poor, than to divide the plunder with the proud."
  }, {
      Id: 1067,
      Name: "Humility",
      Reference: "Genesis 18:27",
      Text: "Abraham answered, “See now, I have taken it on myself to speak to the Lord, although I am dust and ashes."
  }, {
      Id: 1068,
      Name: "Humility",
      Reference: "James 1:9-10",
      Text: "Let the brother in humble circumstances glory in his high position; and the rich, in that he is made humble, because like the flower in the grass, he will pass away."
  }, {
      Id: 1069,
      Name: "Humility",
      Reference: "Philippians 2:2",
      Text: "make my joy full by being like-minded, having the same love, being of one accord, of one mind;"
  }, {
      Id: 1070,
      Name: "Humility",
      Reference: "1 Timothy 1:15",
      Text: "The saying is faithful and worthy of all acceptance, that Christ Jesus came into the world to save sinners, of whom I am chief."
  }, {
      Id: 1071,
      Name: "Humility",
      Reference: "Isaiah 6:5",
      Text: "Then I said, “Woe is me! For I am undone, because I am a man of unclean lips and I live among a people of unclean lips, for my eyes have seen the King, Yahweh of Armies!”"
  }, {
      Id: 1072,
      Name: "Humility",
      Reference: "Romans 12:2",
      Text: "Don’t be conformed to this world, but be transformed by the renewing of your mind, so that you may prove what is the good, well-pleasing, and perfect will of God."
  }, {
      Id: 1073,
      Name: "Humility",
      Reference: "Psalms 95:6",
      Text: "Oh come, let’s worship and bow down.Let’s kneel before Yahweh, our Maker,"
  }, {
      Id: 1074,
      Name: "Humility",
      Reference: "James 1:21",
      Text: "Therefore, putting away all filthiness and overflowing of wickedness, receive with humility the implanted word, which is able to save your souls."
  }, {
      Id: 1075,
      Name: "Humility",
      Reference: "Psalms 76:8",
      Text: "You pronounced judgment from heaven. The earth feared, and was silent,"
  }, {
      Id: 1076,
      Name: "Humility",
      Reference: "Ephesians 4:31-32",
      Text: "Let all bitterness, wrath, anger, outcry, and slander be put away from you, with all malice. And be kind to one another, tender hearted, forgiving each other, just as God also in Christ forgave you."
  }, {
      Id: 1077,
      Name: "Humility",
      Reference: "Colossians 3:1-25",
      Text: "Put on therefore, as God’s chosen ones, holy and beloved, a heart of compassion, kindness, lowliness, humility, and perseverance;"
  }, {
      Id: 1078,
      Name: "Humility",
      Reference: "Jeremiah 45:5",
      Text: "Do you seek great things for yourself? Don’t seek them; for, behold, I will bring evil on all flesh,’ says Yahweh, ‘but I will let you escape with your life wherever you go.’”"
  }, {
      Id: 1079,
      Name: "Humility",
      Reference: "1 Peter 3:3",
      Text: "Let your beauty come not from the outward adorning of braiding your hair, and of wearing gold ornaments or of putting on fine clothing,"
  }, {
      Id: 1080,
      Name: "Forgiveness",
    Reference: "1 John 1:9",
      Text: "If we confess our sins, he is faithful and righteous to forgive us the sins and to cleanse us from all unrighteousness.",
    Lie: "If you sin, there is no hope. Run away from God."
  },
  
  {
      Id: 1082,
      Name: "Forgiveness",
    Reference: "Ephesians 4:32",
      Text: "And be kind to one another, tender hearted, forgiving each other, just as God also in Christ forgave you."
  },
   {
      Id: 1081,
      Name: "Forgiveness",
      Reference: "Mark 11:25",
      Text: "Whenever you stand praying, forgive, if you have anything against anyone; so that your Father, who is in heaven, may also forgive you your transgressions.",
    Lie: "You can hold a grudge and still get answered prayer."
  },  {
      Id: 1083,
      Name: "Forgiveness",
      Reference: "Matthew 6:15",
      Text: "But if you don’t forgive men their trespasses, neither will your Father forgive your trespasses.",
    Lie: "You don't have to forgive. People don't deserve your forgiveness."
  }, {
      Id: 1084,
      Name: "Forgiveness",
      Reference: "Matthew 18:21-22",
      Text: "Then Peter came and said to him, “Lord, how often shall my brother sin against me, and I forgive him? Until seven times?” Jesus said to him,“I don’t tell you until seven times, but, until seventy times seven."
  }, {
      Id: 1085,
      Name: "Forgiveness",
      Reference: "Matthew 6:14-15",
      Text: "“For if you forgive men their trespasses, your heavenly Father will also forgive you. But if you don’t forgive men their trespasses, neither will your Father forgive your trespasses."
  }, {
      Id: 1086,
      Name: "Forgiveness",
      Reference: "Luke 6:37",
      Text: "Don’t judge, and you won’t be judged. Don’t condemn, and you won’t be condemned. Set free, and you will be set free."
  }, {
      Id: 1087,
      Name: "Forgiveness",
      Reference: "Colossians 3:13",
      Text: "bearing with one another, and forgiving each other, if any man has a complaint against any; even as Christ forgave you, so you also do."
  }, {
      Id: 1088,
      Name: "Forgiveness",
      Reference: "James 5:16",
      Text: "Confess your sins to one another and pray for one another, that you may be healed. The insistent prayer of a righteous person is powerfully effective."
  }, {
      Id: 1089,
      Name: "Forgiveness",
      Reference: "Luke 6:27",
      Text: "“But I tell you who hear: love your enemies, do good to those who hate you,"
  }, {
      Id: 1090,
      Name: "Forgiveness",
      Reference: "Psalms 103:12-13",
      Text: "As far as the east is from the west, so far has he removed our transgressions from us. Like a father has compassion on his children, so Yahweh has compassion on those who fear him."
  }, {
      Id: 1091,
      Name: "Forgiveness",
      Reference: "Proverbs 10:12",
      Text: "Hatred stirs up strife, but love covers all wrongs."
  }, {
      Id: 1092,
      Name: "Forgiveness",
      Reference: "Ephesians 1:7",
      Text: "In him we have our redemption through his blood, the forgiveness of our trespasses, according to the riches of his grace"
  }, {
      Id: 1093,
      Name: "Forgiveness",
      Reference: "Matthew 6:12",
      Text: "Forgive us our debts, as we also forgive our debtors."
  }, {
      Id: 1094,
      Name: "Forgiveness",
      Reference: "Acts 2:38",
      Text: "Peter said to them, “Repent and be baptized, every one of you, in the name of Jesus Christ for the forgiveness of sins, and you will receive the gift of the Holy Spirit."
  }, {
      Id: 1095,
      Name: "Forgiveness",
      Reference: "Matthew 6:14",
      Text: "“For if you forgive men their trespasses, your heavenly Father will also forgive you."
  }, {
      Id: 1096,
      Name: "Forgiveness",
      Reference: "Luke 17:3-4",
      Text: "Be careful. If your brother sins against you, rebuke him. If he repents, forgive him. If he sins against you seven times in the day, and seven times returns, saying, ‘I repent,’ you shall forgive him.”"
  }, {
      Id: 1097,
      Name: "Forgiveness",
      Reference: "1 Corinthians 10:13",
      Text: "No temptation has taken you except what is common to man. God is faithful, who will not allow you to be tempted above what you are able, but will with the temptation also make the way of escape, that you may be able to endure it."
  }, {
      Id: 1098,
      Name: "Forgiveness",
      Reference: "Proverbs 17:9",
      Text: "He who covers an offense promotes love"
  }, {
      Id: 1099,
      Name: "Forgiveness",
      Reference: "Isaiah 1:18",
      Text: "“Come now, and let’s reason together,” says Yahweh:“Though your sins are as scarlet, they shall be as white as snow. Though they are red like crimson, they shall be as wool."
  }, {
      Id: 1100,
      Name: "Forgiveness",
      Reference: "Psalms 32:5",
      Text: "I acknowledged my sin to you. I didn’t hide my iniquity. I said, I will confess my transgressions to Yahweh, and you forgave the iniquity of my sin."
  }, {
      Id: 1101,
      Name: "Forgiveness",
      Reference: "Romans 3:23",
      Text: "for all have sinned, and fall short of the glory of God;"
  }, {
      Id: 1102,
      Name: "Forgiveness",
      Reference: "Proverbs 28:13",
      Text: "He who conceals his sins doesn’t prosper, but whoever confesses and renounces them finds mercy."
  }, {
      Id: 1103,
      Name: "Forgiveness",
      Reference: "Luke 23:34",
      Text: "Jesus said,“Father, forgive them, for they don’t know what they are doing.” Dividing his garments among them, they cast lots."
  }, {
      Id: 1104,
      Name: "Forgiveness",
      Reference: "Daniel 9:9",
      Text: "To the Lord our God belong mercies and forgiveness, for we have rebelled against him."
  }, {
      Id: 1105,
      Name: "Forgiveness",
      Reference: "Acts 3:19",
      Text: "“Repent therefore, and turn again, that your sins may be blotted out, so that there may come times of refreshing from the presence of the Lord,"
  }, {
      Id: 1106,
      Name: "Forgiveness",
      Reference: "Ephesians 4:31-32",
      Text: "Let all bitterness, wrath, anger, outcry, and slander be put away from you, with all malice. And be kind to one another, tender hearted, forgiving each other, just as God also in Christ forgave you."
  }, {
      Id: 1107,
      Name: "Forgiveness",
      Reference: "Matthew 26:28",
      Text: "for this is my blood of the new covenant, which is poured out for many for the remission of sins."
  }, {
      Id: 1108,
      Name: "Forgiveness",
      Reference: "Isaiah 55:7",
      Text: "Let the wicked forsake his way, and the unrighteous man his thoughts.Let him return to Yahweh, and he will have mercy on him, to our God, for he will freely pardon."
  }, {
      Id: 1109,
      Name: "Forgiveness",
      Reference: "1 John 1:9-10",
      Text: "If we confess our sins, he is faithful and righteous to forgive us the sins and to cleanse us from all unrighteousness. If we say that we haven’t sinned, we make him a liar, and his word is not in us."
  }, {
      Id: 1110,
      Name: "Forgiveness",
      Reference: "Ecclesiastes 7:20",
      Text: "Surely there is not a righteous man on earth who does good and doesn’t sin."
  }, {
      Id: 1111,
      Name: "Forgiveness",
      Reference: "Psalms 103:12",
      Text: "As far as the east is from the west, so far has he removed our transgressions from us."
  }, {
      Id: 1112,
      Name: "Forgiveness",
      Reference: "John 3:16",
      Text: "For God so loved the world, that he gave his only born Son, that whoever believes in him should not perish, but have eternal life."
  }, {
      Id: 1113,
      Name: "Forgiveness",
      Reference: "Matthew 5:23-24",
      Text: "“If therefore you are offering your gift at the altar, and there remember that your brother has anything against you, leave your gift there before the altar, and go your way. First be reconciled to your brother, and then come and offer your gift."
  }, {
      Id: 1114,
      Name: "Forgiveness",
      Reference: "Romans 12:20",
      Text: "Therefore“If your enemy is hungry, feed him. If he is thirsty, give him a drink; for in doing so, you will heap coals of fire on his head.”"
  }, {
      Id: 1115,
      Name: "Forgiveness",
      Reference: "Luke 7:47",
      Text: "Therefore I tell you, her sins, which are many, are forgiven, for she loved much. But one to whom little is forgiven, loves little.”"
  }, {
      Id: 1116,
      Name: "Forgiveness",
      Reference: "2 Chronicles 7:14",
      Text: "if my people who are called by my name will humble themselves, pray, seek my face, and turn from their wicked ways, then I will hear from heaven, will forgive their sin, and will heal their land."
  }, {
      Id: 1117,
      Name: "Forgiveness",
      Reference: "Acts 10:43",
      Text: "All the prophets testify about him, that through his name everyone who believes in him will receive remission of sins.”"
  }, {
      Id: 1118,
      Name: "Forgiveness",
      Reference: "1 John 2:1",
      Text: "My little children, I write these things to you so that you may not sin. If anyone sins, we have a Counselor with the Father, Jesus Christ, the righteous."
  }, {
      Id: 1119,
      Name: "Forgiveness",
      Reference: "Romans 6:23",
      Text: "For the wages of sin is death, but the free gift of God is eternal life in Christ Jesus our Lord."
  }, {
      Id: 1120,
      Name: "Forgiveness",
      Reference: "Psalms 86:5",
      Text: "For you, Lord, are good, and ready to forgive, abundant in loving kindness to all those who call on you."
  }, {
      Id: 1121,
      Name: "Forgiveness",
      Reference: "1 John 1:8",
      Text: "If we say that we have no sin, we deceive ourselves, and the truth is not in us."
  }, {
      Id: 1122,
      Name: "Forgiveness",
      Reference: "Colossians 1:13-14",
      Text: "who delivered us out of the power of darkness, and translated us into the Kingdom of the Son of his love, in whom we have our redemption, the forgiveness of our sins."
  }, {
      Id: 1123,
      Name: "Forgiveness",
      Reference: "Romans 8:1",
      Text: "There is therefore now no condemnation to those who are in Christ Jesus, who don’t walk according to the flesh, but according to the Spirit."
  }, {
      Id: 1124,
      Name: "Forgiveness",
      Reference: "Hebrews 10:17",
      Text: "“I will remember their sins and their iniquities no more.”"
  }, {
      Id: 1125,
      Name: "Forgiveness",
      Reference: "Proverbs 25:21",
      Text: "If your enemy is hungry, give him food to eat. If he is thirsty, give him water to drink;"
  }, {
      Id: 1126,
      Name: "Forgiveness",
      Reference: "2 Corinthians 5:17",
      Text: "Therefore if anyone is in Christ, he is a new creation. The old things have passed away. Behold, all things have become new."
  }, {
      Id: 1127,
      Name: "Forgiveness",
      Reference: "Jeremiah 31:34",
      Text: "They will no longer each teach his neighbor, and every man teach his brother, saying, ‘Know Yahweh;’ for they will all know me, from their least to their greatest,” says Yahweh, “for I will forgive their iniquity, and I will remember their sin no more.”"
  }, {
      Id: 1128,
      Name: "Forgiveness",
      Reference: "John 13:34",
      Text: "A new commandment I give to you, that you love one another. Just as I have loved you, you also love one another."
  }, {
      Id: 1129,
      Name: "Forgiveness",
      Reference: "Isaiah 43:25",
      Text: "I, even I, am he who blots out your transgressions for my own sake; and I will not remember your sins."
  }, {
      Id: 1130,
      Name: "Forgiveness",
      Reference: "Micah 7:18-19",
      Text: "Who is a God like you, who pardons iniquity, and passes over the disobedience of the remnant of his heritage? He doesn’t retain his anger forever, because he delights in loving kindness. He will again have compassion on us. He will tread our iniquities under foot. You will cast all their sins into the depths of the sea."
  }, {
      Id: 1131,
      Name: "Forgiveness",
      Reference: "Matthew 5:44",
      Text: "But I tell you, love your enemies, bless those who curse you, do good to those who hate you, and pray for those who mistreat you and persecute you,"
  }, {
      Id: 1132,
      Name: "Forgiveness",
      Reference: "Hebrews 8:12",
      Text: "For I will be merciful to their unrighteousness. I will remember their sins and lawless deeds no more.”"
  }, {
      Id: 1133,
      Name: "Forgiveness",
      Reference: "Luke 23:33-34",
      Text: "When they came to the place that is called “The Skull”, they crucified him there with the criminals, one on the right and the other on the left. Jesus said,“Father, forgive them, for they don’t know what they are doing.” Dividing his garments among them, they cast lots."
  }, {
      Id: 1134,
      Name: "Forgiveness",
      Reference: "Matthew 5:7",
      Text: "Blessed are the merciful, for they shall obtain mercy."
  }, {
      Id: 1135,
      Name: "Forgiveness",
      Reference: "Acts 7:59-60",
      Text: "They stoned Stephen as he called out, saying, “Lord Jesus, receive my spirit!” He kneeled down and cried with a loud voice, “Lord, don’t hold this sin against them!” When he had said this, he fell asleep."
  }, {
      Id: 1136,
      Name: "Forgiveness",
      Reference: "Micah 7:18",
      Text: "Who is a God like you, who pardons iniquity, and passes over the disobedience of the remnant of his heritage? He doesn’t retain his anger forever, because he delights in loving kindness."
  }, {
      Id: 1137,
      Name: "Forgiveness",
      Reference: "Isaiah 43:25-26",
      Text: "I, even I, am he who blots out your transgressions for my own sake; and I will not remember your sins. Put me in remembrance. Let us plead together. Declare your case, that you may be justified."
  }, {
      Id: 1138,
      Name: "Forgiveness",
      Reference: "James 5:14-15",
      Text: "Is any among you sick? Let him call for the elders of the assembly, and let them pray over him, anointing him with oil in the name of the Lord; and the prayer of faith will heal him who is sick, and the Lord will raise him up. If he has committed sins, he will be forgiven."
  }, {
      Id: 1139,
      Name: "Forgiveness",
      Reference: "Isaiah 53:5",
      Text: "But he was pierced for our transgressions. He was crushed for our iniquities. The punishment that brought our peace was on him"
  }, {
      Id: 1140,
      Name: "Forgiveness",
      Reference: "Ephesians 2:8",
      Text: "for by grace you have been saved through faith, and that not of yourselves; it is the gift of God,"
  }, {
      Id: 1141,
      Name: "Forgiveness",
      Reference: "John 8:7",
      Text: "But when they continued asking him, he looked up and said to them,“He who is without sin among you, let him throw the first stone at her.”"
  }, {
      Id: 1142,
      Name: "Forgiveness",
      Reference: "1 John 2:12",
      Text: "I write to you, little children, because your sins are forgiven you for his name’s sake."
  }, {
      Id: 1143,
      Name: "Forgiveness",
      Reference: "Psalms 130:4",
      Text: "But there is forgiveness with you, therefore you are feared."
  }, {
      Id: 1144,
      Name: "Forgiveness",
      Reference: "1 John 2:2",
      Text: "And he is the atoning sacrifice for our sins, and not for ours only, but also for the whole world."
  }, {
      Id: 1145,
      Name: "Forgiveness",
      Reference: "Acts 17:30",
      Text: "The times of ignorance therefore God overlooked. But now he commands that all people everywhere should repent,"
  }, {
      Id: 1146,
      Name: "Forgiveness",
      Reference: "Matthew 18:34-35",
      Text: "His lord was angry, and delivered him to the tormentors until he should pay all that was due to him. So my heavenly Father will also do to you, if you don’t each forgive your brother from your hearts for his misdeeds.”"
  }, {
      Id: 1147,
      Name: "Forgiveness",
      Reference: "Psalms 51:2-5",
      Text: "Wash me thoroughly from my iniquity.Cleanse me from my sin. For I know my transgressions. My sin is constantly before me. Against you, and you only, I have sinned, and done that which is evil in your sight,so you may be proved right when you speak, and justified when you judge. Behold, I was born in iniquity. My mother conceived me in sin."
  }, {
      Id: 1148,
      Name: "Forgiveness",
      Reference: "Acts 22:16",
      Text: "Now why do you wait? Arise, be baptized, and wash away your sins, calling on the name of the Lord.’"
  }, {
      Id: 1149,
      Name: "Forgiveness",
      Reference: "Acts 13:38-39",
      Text: "Be it known to you therefore, brothers, that through this man is proclaimed to you remission of sins; and by him everyone who believes is justified from all things, from which you could not be justified by the law of Moses."
  }, {
      Id: 1150,
      Name: "Forgiveness",
      Reference: "Joel 2:13",
      Text: "Tear your heart and not your garments, and turn to Yahweh, your God; for he is gracious and merciful, slow to anger, and abundant in loving kindness, and relents from sending calamity."
  }, {
      Id: 1151,
      Name: "Forgiveness",
      Reference: "Romans 12:17",
      Text: "Repay no one evil for evil. Respect what is honorable in the sight of all men."
  },  {
      Id: 1153,
      Name: "Forgiveness",
      Reference: "Matthew 6:9-15",
      Text: "“For if you forgive men their trespasses, your heavenly Father will also forgive you. But if you don’t forgive men their trespasses, neither will your Father forgive your trespasses."
  }, {
      Id: 1154,
      Name: "Forgiveness",
      Reference: "Colossians 1:14",
      Text: "in whom we have our redemption, the forgiveness of our sins."
  }, {
      Id: 1155,
      Name: "Forgiveness",
      Reference: "Ephesians 4:31",
      Text: "Let all bitterness, wrath, anger, outcry, and slander be put away from you, with all malice."
  }, {
      Id: 1156,
      Name: "Forgiveness",
      Reference: "Proverbs 15:1",
      Text: "A gentle answer turns away wrath, but a harsh word stirs up anger."
  }, {
      Id: 1157,
      Name: "Forgiveness",
      Reference: "John 3:16-17",
      Text: "For God so loved the world, that he gave his only born Son, that whoever believes in him should not perish, but have eternal life. For God didn’t send his Son into the world to judge the world, but that the world should be saved through him."
  }, {
      Id: 1158,
      Name: "Forgiveness",
      Reference: "Jeremiah 3:12",
      Text: "Go, and proclaim these words toward the north, and say, ‘Return, you backsliding Israel,’ says Yahweh; ‘ I will not look in anger on you, for I am merciful,’ says Yahweh. ‘I will not keep anger forever."
  }, {
      Id: 1159,
      Name: "Forgiveness",
      Reference: "2 Chronicles 30:9",
      Text: "For if you turn again to Yahweh, your brothers and your children will find compassion with those who led them captive, and will come again into this land, because Yahweh your God is gracious and merciful, and will not turn away his face from you if you return to him.”"
  }, {
      Id: 1160,
      Name: "Forgiveness",
      Reference: "Matthew 7:21",
      Text: "Not everyone who says to me, ‘Lord, Lord,’ will enter into the Kingdom of Heaven, but he who does the will of my Father who is in heaven."
  }, {
      Id: 1161,
      Name: "Forgiveness",
      Reference: "James 2:8",
      Text: "However, if you fulfill the royal law according to the Scripture, “You shall love your neighbor as yourself,” you do well."
  }, {
      Id: 1162,
      Name: "Forgiveness",
      Reference: "1 Peter 4:8",
      Text: "And above all things be earnest in your love among yourselves, for love covers a multitude of sins."
  }, {
      Id: 1163,
      Name: "Forgiveness",
      Reference: "Colossians 3:12-13",
      Text: "Put on therefore, as God’s chosen ones, holy and beloved, a heart of compassion, kindness, lowliness, humility, and perseverance; bearing with one another, and forgiving each other, if any man has a complaint against any; even as Christ forgave you, so you also do."
  }, {
      Id: 1164,
      Name: "Forgiveness",
      Reference: "Micah 7:18-20",
      Text: "Who is a God like you, who pardons iniquity, and passes over the disobedience of the remnant of his heritage? He doesn’t retain his anger forever, because he delights in loving kindness. He will again have compassion on us. He will tread our iniquities under foot. You will cast all their sins into the depths of the sea. You will give truth to Jacob, and mercy to Abraham, as you have sworn to our fathers from the days of old."
  }, {
      Id: 1165,
      Name: "Forgiveness",
      Reference: "1 Peter 3:9",
      Text: "not rendering evil for evil or insult for insult; but instead blessing, knowing that you were called to this, that you may inherit a blessing."
  }, {
      Id: 1166,
      Name: "Forgiveness",
      Reference: "Galatians 5:22",
      Text: "But the fruit of the Spirit is love, joy, peace, patience, kindness, goodness, faith,"
  }, {
      Id: 1167,
      Name: "Forgiveness",
      Reference: "Luke 17:3",
      Text: "Be careful. If your brother sins against you, rebuke him. If he repents, forgive him."
  }, {
      Id: 1168,
      Name: "Forgiveness",
      Reference: "Matthew 6:12-15",
      Text: "Forgive us our debts, as we also forgive our debtors. Bring us not into temptation, but deliver us from the evil one. For yours is the Kingdom, the power, and the glory forever. Amen.’ “For if you forgive men their trespasses, your heavenly Father will also forgive you. But if you don’t forgive men their trespasses, neither will your Father forgive your trespasses."
  }, {
      Id: 1169,
      Name: "Forgiveness",
      Reference: "2 Corinthians 2:5-8",
      Text: "But if any has caused sorrow, he has caused sorrow not to me, but in part ( that I not press too heavily) to you all. This punishment which was inflicted by the many is sufficient for such a one; so that, on the contrary, you should rather forgive him and comfort him, lest by any means such a one should be swallowed up with his excessive sorrow. Therefore I beg you to confirm your love toward him."
  }, {
      Id: 1170,
      Name: "Forgiveness",
      Reference: "Galatians 6:1",
      Text: "Brothers, even if a man is caught in some fault, you who are spiritual must restore such a one in a spirit of gentleness, looking to yourself so that you also aren’t tempted."
  }, {
      Id: 1171,
      Name: "Forgiveness",
      Reference: "Psalms 38:3-4",
      Text: "There is no soundness in my flesh because of your indignation,neither is there any health in my bones because of my sin. For my iniquities have gone over my head. As a heavy burden, they are too heavy for me."
  }, {
      Id: 1172,
      Name: "Forgiveness",
      Reference: "Proverbs 28:9",
      Text: "He who turns away his ear from hearing the law, even his prayer is an abomination."
  }, {
      Id: 1173,
      Name: "Forgiveness",
      Reference: "Psalms 130:3",
      Text: "If you, Yah, kept a record of sins, Lord, who could stand?"
  }, {
      Id: 1174,
      Name: "Forgiveness",
      Reference: "Ephesians 4:26-27",
      Text: "“Be angry, and don’t sin.” Don’t let the sun go down on your wrath, and don’t give place to the devil."
  }, {
      Id: 1175,
      Name: "Hope",
      Reference: "Jeremiah 29:11",
      Text: "For I know the thoughts that I think toward you,” says Yahweh, “thoughts of peace, and not of evil, to give you hope and a future.",
    Lie: "God is not thinking about you."
  }, {
      Id: 1176,
      Name: "Hope",
      Reference: "Romans 15:13",
      Text: "Now may the God of hope fill you with all joy and peace in believing, that you may abound in hope in the power of the Holy Spirit.",
    Lie: "It is normal to be a bit down about all your troubles and you can't expect to feel God."
  }, {
      Id: 1177,
      Name: "Hope",
      Reference: "Romans 12:12",
      Text: "rejoicing in hope, enduring in troubles, continuing steadfastly in prayer,",
    Lie: "There is no lasting hope. Just give up."
  }, {
      Id: 1178,
      Name: "Hope",
      Reference: "Hebrews 11:1",
      Text: "Now faith is assurance of things hoped for, proof of things not seen.",
    Lie: "Just try to have faith, even though it is hopeless."
  }, {
      Id: 1179,
      Name: "Hope",
      Reference: "Isaiah 40:31",
      Text: "but those who wait for Yahweh will renew their strength. They will mount up with wings like eagles. They will run, and not be weary. They will walk, and not faint.",
    Lie: "If you are burned out, you were never get back to a place of strength."
  }, {
      Id: 1181,
      Name: "Hope",
      Reference: "1 Peter 1:3",
      Text: "Blessed be the God and Father of our Lord Jesus Christ, who according to his great mercy caused us to be born again to a living hope through the resurrection of Jesus Christ from the dead,",
    Lie: "There is no hope. Especially not after you die."
  }, {
      Id: 1182,
      Name: "Hope",
      Reference: "Romans 15:4",
      Text: "For whatever things were written before were written for our learning, that through perseverance and through encouragement of the Scriptures we might have hope.",
    Lie: "The Scriptures will probably make you even more hopeless."
  }, {
      Id: 1183,
      Name: "Hope",
      Reference: "Psalms 39:7",
      Text: "Now, Lord, what do I wait for? My hope is in you.",
    Lie: "Put your hope in society."
  }, {
      Id: 1184,
      Name: "Hope",
      Reference: "Colossians 1:27",
      Text: "to whom God was pleased to make known what are the riches of the glory of this mystery among the Gentiles, which is Christ in you, the hope of glory.",
    Lie: "The idea of Christ being in you sounds like bad news."
  },  {
      Id: 1186,
      Name: "Hope",
      Reference: "Romans 5:5",
      Text: "and hope doesn’t disappoint us, because God’s love has been poured into our hearts through the Holy Spirit who was given to us."
  },  {
      Id: 1188,
      Name: "Hope",
      Reference: "Deuteronomy 31:6",
      Text: "Be strong and courageous. Don’t be afraid or scared of them, for Yahweh your God himself is who goes with you. He will not fail you nor forsake you.”"
  }, {
      Id: 1189,
      Name: "Hope",
      Reference: "Romans 5:2-5",
      Text: "through whom we also have our access by faith into this grace in which we stand. We rejoice in hope of the glory of God. Not only this, but we also rejoice in our sufferings, knowing that suffering produces perseverance; and perseverance, proven character; and proven character, hope; and hope doesn’t disappoint us, because God’s love has been poured into our hearts through the Holy Spirit who was given to us."
  }, {
      Id: 1190,
      Name: "Hope",
      Reference: "Revelation 21:4",
      Text: "He will wipe away every tear from their eyes. Death will be no more; neither will there be mourning, nor crying, nor pain any more. The first things have passed away.”"
  }, {
      Id: 1191,
      Name: "Hope",
      Reference: "Proverbs 23:18",
      Text: "Indeed surely there is a future hope, and your hope will not be cut off."
  }, {
      Id: 1192,
      Name: "Hope",
      Reference: "2 Corinthians 4:16-18",
      Text: "Therefore we don’t faint, but though our outward person is decaying, yet our inward person is renewed day by day. For our light affliction, which is for the moment, works for us more and more exceedingly an eternal weight of glory, while we don’t look at the things which are seen, but at the things which are not seen. For the things which are seen are temporal, but the things which are not seen are eternal."
  }, {
      Id: 1193,
      Name: "Hope",
      Reference: "Proverbs 24:14",
      Text: "so you shall know wisdom to be to your soul. If you have found it, then there will be a reward: Your hope will not be cut off."
  }, {
      Id: 1194,
      Name: "Hope",
      Reference: "Psalms 71:5",
      Text: "For you are my hope, Lord Yahweh, my confidence from my youth."
  }, {
      Id: 1195,
      Name: "Hope",
      Reference: "Isaiah 41:10",
      Text: "Don’t you be afraid, for I am with you. Don’t be dismayed, for I am your God. I will strengthen you. Yes, I will help you. Yes, I will uphold you with the right hand of my righteousness."
  }, {
      Id: 1196,
      Name: "Hope",
      Reference: "Titus 3:7",
      Text: "that being justified by his grace, we might be made heirs according to the hope of eternal life."
  }, {
      Id: 1197,
      Name: "Hope",
      Reference: "1 Peter 3:15",
      Text: "But sanctify the Lord God in your hearts. Always be ready to give an answer to everyone who asks you a reason concerning the hope that is in you, with humility and fear,"
  }, {
      Id: 1198,
      Name: "Hope",
      Reference: "Zephaniah 3:17",
      Text: "Yahweh, your God, is among you, a mighty one who will save. He will rejoice over you with joy. He will calm you in his love. He will rejoice over you with singing."
  }, {
      Id: 1199,
      Name: "Hope",
      Reference: "Hebrews 10:23",
      Text: "let’s hold fast the confession of our hope without wavering"
  }, {
      Id: 1200,
      Name: "Hope",
      Reference: "Psalms 31:24",
      Text: "Be strong, and let your heart take courage, all you who hope in Yahweh."
  }, {
      Id: 1201,
      Name: "Hope",
      Reference: "Lamentations 3:24",
      Text: "“Yahweh is my portion,” says my soul.“Therefore I will hope in him.”"
  }, {
      Id: 1202,
      Name: "Hope",
      Reference: "1 Thessalonians 5:8",
      Text: "But since we belong to the day, let’s be sober, putting on the breastplate of faith and love, and for a helmet, the hope of salvation."
  }, {
      Id: 1203,
      Name: "Hope",
      Reference: "Hebrews 6:19",
      Text: "This hope we have as an anchor of the soul, a hope both sure and steadfast and entering into that which is within the veil,"
  }, {
      Id: 1204,
      Name: "Hope",
      Reference: "Psalms 119:114",
      Text: "You are my hiding place and my shield. I hope in your word."
  }, {
      Id: 1205,
      Name: "Hope",
      Reference: "Jeremiah 17:7",
      Text: "“Blessed is the man who trusts in Yahweh, and whose confidence is in Yahweh."
  }, {
      Id: 1206,
      Name: "Hope",
      Reference: "Romans 8:24",
      Text: "For we were saved in hope, but hope that is seen is not hope. For who hopes for that which he sees?"
  }, {
      Id: 1207,
      Name: "Hope",
      Reference: "Ephesians 1:18",
      Text: "having the eyes of your hearts enlightened, that you may know what is the hope of his calling, and what are the riches of the glory of his inheritance in the saints,"
  }, {
      Id: 1208,
      Name: "Hope",
      Reference: "Titus 2:13",
      Text: "looking for the blessed hope and appearing of the glory of our great God and Savior, Jesus Christ,"
  }, {
      Id: 1209,
      Name: "Hope",
      Reference: "Psalms 71:14",
      Text: "But I will always hope, and will add to all of your praise."
  }, {
      Id: 1210,
      Name: "Hope",
      Reference: "Psalms 33:18",
      Text: "Behold, Yahweh’s eye is on those who fear him, on those who hope in his loving kindness,"
  }, {
      Id: 1211,
      Name: "Hope",
      Reference: "Mark 9:23",
      Text: "Jesus said to him, “If you can believe, all things are possible to him who believes.”"
  }, {
      Id: 1212,
      Name: "Hope",
      Reference: "Psalms 130:5",
      Text: "I wait for Yahweh. My soul waits. I hope in his word."
  }, {
      Id: 1213,
      Name: "Hope",
      Reference: "Proverbs 13:12",
      Text: "Hope deferred makes the heart sick, but when longing is fulfilled, it is a tree of life."
  }, {
      Id: 1214,
      Name: "Hope",
      Reference: "Psalms 33:22",
      Text: "Let your loving kindness be on us, Yahweh, since we have hoped in you."
  }, {
      Id: 1215,
      Name: "Hope",
      Reference: "1 Thessalonians 1:3",
      Text: "remembering without ceasing your work of faith and labor of love and perseverance of hope in our Lord Jesus Christ, before our God and Father."
  }, {
      Id: 1216,
      Name: "Hope",
      Reference: "John 3:16",
      Text: "For God so loved the world, that he gave his only born Son, that whoever believes in him should not perish, but have eternal life."
  }, {
      Id: 1217,
      Name: "Hope",
      Reference: "Psalms 147:11",
      Text: "Yahweh takes pleasure in those who fear him, in those who hope in his loving kindness."
  }, {
      Id: 1218,
      Name: "Hope",
      Reference: "Galatians 5:5",
      Text: "For we through the Spirit, by faith wait for the hope of righteousness."
  }, {
      Id: 1219,
      Name: "Hope",
      Reference: "1 Corinthians 15:19",
      Text: "If we have only hoped in Christ in this life, we are of all men most pitiable."
  }, {
      Id: 1220,
      Name: "Hope",
      Reference: "1 John 3:3",
      Text: "Everyone who has this hope set on him purifies himself, even as he is pure."
  }, {
      Id: 1221,
      Name: "Hope",
      Reference: "Romans 8:28",
      Text: "We know that all things work together for good for those who love God, for those who are called according to his purpose."
  }, {
      Id: 1222,
      Name: "Hope",
      Reference: "Titus 1:2",
      Text: "in hope of eternal life, which God, who can’t lie, promised before time began;"
  }, {
      Id: 1223,
      Name: "Hope",
      Reference: "Psalms 9:18",
      Text: "For the needy shall not always be forgotten,nor the hope of the poor perish forever."
  }, {
      Id: 1224,
      Name: "Hope",
      Reference: "1 Peter 1:13",
      Text: "Therefore prepare your minds for action. Be sober, and set your hope fully on the grace that will be brought to you at the revelation of Jesus Christ—"
  }, {
      Id: 1225,
      Name: "Hope",
      Reference: "Titus 1:1-2",
      Text: "Paul, a servant of God and an apostle of Jesus Christ, according to the faith of God’s chosen ones and the knowledge of the truth which is according to godliness, in hope of eternal life, which God, who can’t lie, promised before time began;"
  }, {
      Id: 1226,
      Name: "Hope",
      Reference: "Psalms 42:11",
      Text: "Why are you in despair, my soul?Why are you disturbed within me?Hope in God! For I shall still praise him, the saving help of my countenance, and my God."
  }, {
      Id: 1227,
      Name: "Hope",
      Reference: "Micah 7:7",
      Text: "But as for me, I will look to Yahweh. I will wait for the God of my salvation. My God will hear me."
  }, {
      Id: 1228,
      Name: "Hope",
      Reference: "Job 11:18",
      Text: "You will be secure, because there is hope. Yes, you will search, and will take your rest in safety."
  }, {
      Id: 1229,
      Name: "Hope",
      Reference: "Psalms 146:5",
      Text: "Happy is he who has the God of Jacob for his help,whose hope is in Yahweh, his God,"
  }, {
      Id: 1230,
      Name: "Hope",
      Reference: "Ephesians 4:4",
      Text: "There is one body and one Spirit, even as you also were called in one hope of your calling,"
  }, {
      Id: 1231,
      Name: "Hope",
      Reference: "Psalms 62:5",
      Text: "My soul, wait in silence for God alone, for my expectation is from him."
  }, {
      Id: 1232,
      Name: "Hope",
      Reference: "Philippians 3:13-14",
      Text: "Brothers, I don’t regard myself as yet having taken hold, but one thing I do: forgetting the things which are behind and stretching forward to the things which are before, I press on toward the goal for the prize of the high calling of God in Christ Jesus."
  }, {
      Id: 1233,
      Name: "Hope",
      Reference: "Psalms 10:17",
      Text: "Yahweh, you have heard the desire of the humble. You will prepare their heart. You will cause your ear to hear,"
  }, {
      Id: 1234,
      Name: "Hope",
      Reference: "Hebrews 6:18-19",
      Text: "that by two immutable things, in which it is impossible for God to lie, we may have a strong encouragement, who have fled for refuge to take hold of the hope set before us. This hope we have as an anchor of the soul, a hope both sure and steadfast and entering into that which is within the veil,"
  }, {
      Id: 1235,
      Name: "Hope",
      Reference: "1 Thessalonians 4:13",
      Text: "But we don’t want you to be ignorant, brothers, concerning those who have fallen asleep, so that you don’t grieve like the rest, who have no hope."
  }, {
      Id: 1236,
      Name: "Hope",
      Reference: "1 Timothy 6:17",
      Text: "Charge those who are rich in this present age that they not be arrogant, nor have their hope set on the uncertainty of riches, but on the living God, who richly provides us with everything to enjoy;"
  }, {
      Id: 1237,
      Name: "Hope",
      Reference: "Hebrews 3:6",
      Text: "but Christ is faithful as a Son over his house. We are his house, if we hold fast our confidence and the glorying of our hope firm to the end."
  }, {
      Id: 1238,
      Name: "Hope",
      Reference: "2 Corinthians 3:12",
      Text: "Having therefore such a hope, we use great boldness of speech,"
  }, {
      Id: 1239,
      Name: "Hope",
      Reference: "1 Corinthians 2:9",
      Text: "But as it is written,“Things which an eye didn’t see, and an ear didn’t hear, which didn’t enter into the heart of man, these God has prepared for those who love him.”"
  }, {
      Id: 1240,
      Name: "Hope",
      Reference: "Psalms 119:81",
      Text: "My soul faints for your salvation. I hope in your word."
  }, {
      Id: 1241,
      Name: "Hope",
      Reference: "Matthew 11:28",
      Text: "“Come to me, all you who labor and are heavily burdened, and I will give you rest."
  }, {
      Id: 1242,
      Name: "Hope",
      Reference: "Psalms 43:5",
      Text: "Why are you in despair, my soul? Why are you disturbed within me? Hope in God! For I shall still praise him: my Savior, my helper, and my God."
  }, {
      Id: 1243,
      Name: "Hope",
      Reference: "Romans 5:2",
      Text: "through whom we also have our access by faith into this grace in which we stand. We rejoice in hope of the glory of God."
  }, {
      Id: 1244,
      Name: "Hope",
      Reference: "2 Timothy 1:7",
      Text: "For God didn’t give us a spirit of fear, but of power, love, and self-control."
  }, {
      Id: 1245,
      Name: "Hope",
      Reference: "1 Timothy 1:1",
      Text: "Paul, an apostle of Jesus Christ according to the commandment of God our Savior and the Lord Jesus Christ our hope,"
  }, {
      Id: 1246,
      Name: "Hope",
      Reference: "2 Corinthians 5:17",
      Text: "Therefore if anyone is in Christ, he is a new creation. The old things have passed away. Behold, all things have become new."
  }, {
      Id: 1247,
      Name: "Hope",
      Reference: "Psalms 23:1-6",
      Text: "Yahweh is my shepherd; I shall lack nothing. He makes me lie down in green pastures. He leads me beside still waters. He restores my soul. He guides me in the paths of righteousness for his name’s sake. Even though I walk through the valley of the shadow of death, I will fear no evil, for you are with me. Your rod and your staff, they comfort me. You prepare a table before me in the presence of my enemies. You anoint my head with oil. My cup runs over. Surely goodness and loving kindness shall follow me all the days of my life, and I will dwell in Yahweh’s house forever."
  }, {
      Id: 1248,
      Name: "Hope",
      Reference: "Matthew 25:21",
      Text: "“His lord said to him, ‘Well done, good and faithful servant. You have been faithful over a few things, I will set you over many things. Enter into the joy of your lord.’"
  }, {
      Id: 1249,
      Name: "Hope",
      Reference: "Romans 8:18",
      Text: "For I consider that the sufferings of this present time are not worthy to be compared with the glory which will be revealed toward us."
  }, {
      Id: 1250,
      Name: "Hope",
      Reference: "Romans 5:3-4",
      Text: "Not only this, but we also rejoice in our sufferings, knowing that suffering produces perseverance; and perseverance, proven character; and proven character, hope;"
  }, {
      Id: 1251,
      Name: "Hope",
      Reference: "1 Peter 5:10",
      Text: "But may the God of all grace, who called you to his eternal glory by Christ Jesus, after you have suffered a little while, perfect, establish, strengthen, and settle you."
  }, {
      Id: 1252,
      Name: "Hope",
      Reference: "Psalms 130:7",
      Text: "Israel, hope in Yahweh, for there is loving kindness with Yahweh.Abundant redemption is with him."
  }, {
      Id: 1253,
      Name: "Hope",
      Reference: "Joel 3:16",
      Text: "Yahweh will roar from Zion,and thunder from Jerusalem;and the heavens and the earth will shake;but Yahweh will be a refuge to his people,and a stronghold to the children of Israel."
  }, {
      Id: 1254,
      Name: "Hope",
      Reference: "Romans 4:18",
      Text: "Against hope, Abraham in hope believed, to the end that he might become a father of many nations, according to that which had been spoken, “So will your offspring be.”"
  }, {
      Id: 1255,
      Name: "Hope",
      Reference: "Proverbs 10:28",
      Text: "The prospect of the righteous is joy, but the hope of the wicked will perish."
  }, {
      Id: 1256,
      Name: "Hope",
      Reference: "Matthew 12:21",
      Text: "In his name, the nations will hope.”"
  }, {
      Id: 1257,
      Name: "Hope",
      Reference: "Zechariah 9:12",
      Text: "Turn to the stronghold, you prisoners of hope! Even today I declare that I will restore double to you."
  }, {
      Id: 1258,
      Name: "Hope",
      Reference: "Numbers 23:19",
      Text: "God is not a man, that he should lie, nor a son of man, that he should repent. Has he said, and he won’t do it? Or has he spoken, and he won’t make it good?"
  }, {
      Id: 1259,
      Name: "Hope",
      Reference: "1 Peter 1:21",
      Text: "who through him are believers in God, who raised him from the dead and gave him glory, so that your faith and hope might be in God."
  }, {
      Id: 1260,
      Name: "Hope",
      Reference: "Colossians 1:23",
      Text: "if it is so that you continue in the faith, grounded and steadfast, and not moved away from the hope of the Good News which you heard, which is being proclaimed in all creation under heaven, of which I, Paul, was made a servant."
  }, {
      Id: 1261,
      Name: "Hope",
      Reference: "Lamentations 3:21",
      Text: "This I recall to my mind"
  }, {
      Id: 1262,
      Name: "Hope",
      Reference: "Job 13:15",
      Text: "Behold, he will kill me. I have no hope. Nevertheless, I will maintain my ways before him."
  }, {
      Id: 1263,
      Name: "Hope",
      Reference: "Psalms 25:5",
      Text: "Guide me in your truth, and teach me, for you are the God of my salvation. I wait for you all day long."
  }, {
      Id: 1264,
      Name: "Hope",
      Reference: "Hebrews 6:11",
      Text: "We desire that each one of you may show the same diligence to the fullness of hope even to the end,"
  }, {
      Id: 1265,
      Name: "Hope",
      Reference: "Ephesians 2:12",
      Text: "that you were at that time separate from Christ, alienated from the commonwealth of Israel, and strangers from the covenants of the promise, having no hope and without God in the world."
  }, {
      Id: 1266,
      Name: "Hope",
      Reference: "Colossians 1:5",
      Text: "because of the hope which is laid up for you in the heavens, of which you heard before in the word of the truth of the Good News"
  }, {
      Id: 1267,
      Name: "Hope",
      Reference: "Psalms 78:7",
      Text: "that they might set their hope in God, and not forget God’s deeds, but keep his commandments,"
  }, {
      Id: 1268,
      Name: "Hope",
      Reference: "2 Corinthians 4:17-18",
      Text: "For our light affliction, which is for the moment, works for us more and more exceedingly an eternal weight of glory, while we don’t look at the things which are seen, but at the things which are not seen. For the things which are seen are temporal, but the things which are not seen are eternal."
  }, {
      Id: 1269,
      Name: "Hope",
      Reference: "Acts 24:15",
      Text: "having hope toward God, which these also themselves look for, that there will be a resurrection of the dead, both of the just and unjust."
  }, {
      Id: 1270,
      Name: "Hope",
      Reference: "Psalms 38:15",
      Text: "For I hope in you, Yahweh. You will answer, Lord my God."
  }, {
      Id: 1271,
      Name: "Hope",
      Reference: "Ephesians 3:20-21",
      Text: "Now to him who is able to do exceedingly abundantly above all that we ask or think, according to the power that works in us, to him be the glory in the assembly and in Christ Jesus to all generations, forever and ever. Amen."
  }, {
      Id: 1272,
      Name: "Hope",
      Reference: "Proverbs 18:10",
      Text: "Yahweh’s name is a strong tower: the righteous run to him, and are safe."
  }, {
      Id: 1273,
      Name: "Hope",
      Reference: "Philippians 1:6",
      Text: "being confident of this very thing, that he who began a good work in you will complete it until the day of Jesus Christ."
  }, {
      Id: 1274,
      Name: "Hope",
      Reference: "John 14:27",
      Text: "Peace I leave with you. My peace I give to you; not as the world gives, I give to you. Don’t let your heart be troubled, neither let it be fearful."
  },
  
  {
      Id: 1281,
      Name: "Praise",
      Reference: "Psalm 71:8",
      Text: "My mouth shall be filled with your praise; with your honor all day long."
  }, 
  {
      Id: 1278,
      Name: "Praise",
      Reference: "Psalms 99:3",
      Text: "Let them praise your great and awesome name. He is Holy!"
  }, 
  {
      Id: 1279,
      Name: "Praise",
      Reference: "Psalms 109:30",
      Text: "I will give great thanks to Yahweh with my mouth.Yes, I will praise him among the multitude."
  }, 
    {
      Id: 1276,
      Name: "Praise",
      Reference: "Hebrews 13:15",
      Text: "Through him, then, let’s offer up a sacrifice of praise to God continually, that is, the fruit of lips which proclaim allegiance to his name."
  }, {
      Id: 1277,
      Name: "Praise",
      Reference: "Psalms 100:1-2",
      Text: "Shout for joy to Yahweh, all you lands!nServe Yahweh with gladness. Come before his presence with singing."
  }, {
      Id: 1280,
      Name: "Praise",
      Reference: "Psalms 106:1",
      Text: "Praise Yahweh! Give thanks to Yahweh, for he is good, for his loving kindness endures forever."
  }, {
      Id: 1275,
      Name: "Praise",
      Reference: "Psalms 150:1-6",
      Text: "Praise Yah! Praise God in his sanctuary! Praise him in his heavens for his acts of power! Praise him for his mighty acts! Praise him according to his excellent greatness!"
  },{
      Id: 1282,
      Name: "Praise",
      Reference: "Psalms 147:1",
      Text: "Praise Yah, for it is good to sing praises to our God; for it is pleasant and fitting to praise him."
  }, {
      Id: 1283,
      Name: "Praise",
      Reference: "Psalms 148:1",
      Text: "Praise Yah! Praise Yahweh from the heavens! Praise him in the heights!"
  }, {
      Id: 1284,
      Name: "Praise",
      Reference: "Psalms 69:30",
      Text: "I will praise the name of God with a song, and will magnify him with thanksgiving."
  }, {
      Id: 1285,
      Name: "Praise",
      Reference: "1 Peter 1:3",
      Text: "Blessed be the God and Father of our Lord Jesus Christ, who according to his great mercy caused us to be born again to a living hope through the resurrection of Jesus Christ from the dead,"
  }, {
      Id: 1286,
      Name: "Praise",
      Reference: "Isaiah 25:1",
      Text: "Yahweh, you are my God. I will exalt you! I will praise your name, for you have done wonderful things, things planned long ago, in complete faithfulness and truth.",
    Lie: "God never does anything great."
  }, {
      Id: 1287,
      Name: "Praise",
      Reference: "Isaiah 43:21",
      Text: "the people which I formed for myself,that they might declare my praise."
  }, {
      Id: 1288,
      Name: "Praise",
      Reference: "Psalms 136:1",
      Text: "Give thanks to Yahweh, for he is good, for his loving kindness endures forever.",
    Lie: "God is not good. God's love doesn't last long."
  }, {
      Id: 1289,
      Name: "Praise",
      Reference: "Jude 1:25",
      Text: "to God our Savior, who alone is wise, be glory and majesty, dominion and power, both now and forever. Amen."
  }, {
      Id: 1290,
      Name: "Praise",
      Reference: "1 Peter 2:9",
      Text: "But you are a chosen race, a royal priesthood, a holy nation, a people for God’s own possession, that you may proclaim the excellence of him who called you out of darkness into his marvelous light."
  }, {
      Id: 1291,
      Name: "Praise",
      Reference: "James 5:13",
      Text: "Is any among you suffering? Let him pray. Is any cheerful? Let him sing praises."
  }, {
      Id: 1292,
      Name: "Praise",
      Reference: "Ephesians 5:19",
      Text: "speaking to one another in psalms, hymns, and spiritual songs; singing and making melody in your heart to the Lord;"
  }, {
      Id: 1293,
      Name: "Praise",
      Reference: "Psalms 103:1-4",
      Text: "Praise Yahweh, my soul! All that is within me, praise his holy name! Praise Yahweh, my soul, and don’t forget all his benefits, who forgives all your sins, who heals all your diseases, who redeems your life from destruction,who crowns you with loving kindness and tender mercies,"
  }, {
      Id: 1294,
      Name: "Praise",
      Reference: "Psalms 99:5",
      Text: "Exalt Yahweh our God. Worship at his footstool. He is Holy!"
  }, {
      Id: 1295,
      Name: "Praise",
      Reference: "Revelation 1:6",
      Text: "and he made us to be a Kingdom, priests to his God and Father— to him be the glory and the dominion forever and ever. Amen."
  }, {
      Id: 1296,
      Name: "Praise",
      Reference: "1 Corinthians 15:57",
      Text: "But thanks be to God, who gives us the victory through our Lord Jesus Christ."
  }, {
      Id: 1297,
      Name: "Praise",
      Reference: "Psalms 150:6",
      Text: "Let everything that has breath praise Yah! Praise Yah!"
  }, {
      Id: 1298,
      Name: "Praise",
      Reference: "Psalms 118:29",
      Text: "Oh give thanks to Yahweh, for he is good, for his loving kindness endures forever."
  }, {
      Id: 1299,
      Name: "Praise",
      Reference: "Psalms 34:1",
      Text: "I will bless Yahweh at all times. His praise will always be in my mouth."
  }, {
      Id: 1300,
      Name: "Praise",
      Reference: "Psalms 71:14",
      Text: "But I will always hope, and will add to all of your praise."
  }, {
      Id: 1301,
      Name: "Praise",
      Reference: "Philippians 4:20",
      Text: "Now to our God and Father be the glory forever and ever! Amen."
  }, {
      Id: 1302,
      Name: "Praise",
      Reference: "Habakkuk 3:17-19",
      Text: "For even though the fig tree doesn’t flourish, nor fruit be in the vines, the labor of the olive fails, the fields yield no food, the flocks are cut off from the fold, and there is no herd in the stalls, yet I will rejoice in Yahweh. I will be joyful in the God of my salvation! Yahweh, the Lord, is my strength. He makes my feet like deer’s feet, and enables me to go in high places. For the music director, on my stringed instruments."
  }, {
      Id: 1303,
      Name: "Praise",
      Reference: "Psalms 100:4",
      Text: "Enter into his gates with thanksgiving, and into his courts with praise. Give thanks to him, and bless his name."
  }, {
      Id: 1304,
      Name: "Praise",
      Reference: "Isaiah 12:1-6",
      Text: "In that day you will say, “I will give thanks to you, Yahweh; for though you were angry with me, your anger has turned away and you comfort me. Behold, God is my salvation. I will trust, and will not be afraid; for Yah, Yahweh, is my strength and song; and he has become my salvation.”"
  }, {
      Id: 1305,
      Name: "Praise",
      Reference: "Psalms 138:1",
      Text: "I will give you thanks with my whole heart. Before the gods, I will sing praises to you."
  }, {
      Id: 1306,
      Name: "Praise",
      Reference: "Psalms 98:1-3",
      Text: "Sing to Yahweh a new song, for he has done marvelous things! His right hand and his holy arm have worked salvation for him. Yahweh has made known his salvation. He has openly shown his righteousness in the sight of the nations. He has remembered his loving kindness and his faithfulness toward the house of Israel. All the ends of the earth have seen the salvation of our God."
  }, {
      Id: 1307,
      Name: "Praise",
      Reference: "Psalms 35:28",
      Text: "My tongue shall talk about your righteousness and about your praise all day long."
  }, {
      Id: 1308,
      Name: "Praise",
      Reference: "Colossians 3:16",
      Text: "Let the word of Christ dwell in you richly; in all wisdom teaching and admonishing one another with psalms, hymns, and spiritual songs, singing with grace in your heart to the Lord."
  }, {
      Id: 1309,
      Name: "Praise",
      Reference: "Psalms 113:1",
      Text: "Praise Yah! Praise, you servants of Yahweh, praise Yahweh’s name."
  }, {
      Id: 1310,
      Name: "Praise",
      Reference: "Psalms 111:10",
      Text: "The fear of Yahweh is the beginning of wisdom. All those who do his work have a good understanding. His praise endures forever!"
  }, {
      Id: 1311,
      Name: "Praise",
      Reference: "Psalms 98:4-6",
      Text: "Make a joyful noise to Yahweh, all the earth!Burst out and sing for joy, yes, sing praises! Sing praises to Yahweh with the harp, with the harp and the voice of melody. With trumpets and sound of the ram’s horn,make a joyful noise before the King, Yahweh."
  }, {
      Id: 1312,
      Name: "Praise",
      Reference: "Exodus 15:2",
      Text: "Yah is my strength and song. He has become my salvation. This is my God, and I will praise him; my father’s God, and I will exalt him."
  }, {
      Id: 1313,
      Name: "Praise",
      Reference: "Romans 11:36",
      Text: "For of him and through him and to him are all things. To him be the glory for ever! Amen."
  }, {
      Id: 1314,
      Name: "Praise",
      Reference: "Psalms 7:17",
      Text: "I will give thanks to Yahweh according to his righteousness, and will sing praise to the name of Yahweh Most High."
  }, {
      Id: 1315,
      Name: "Praise",
      Reference: "Daniel 2:23",
      Text: "I thank you and praise you,O God of my fathers, who have given me wisdom and might, and have now made known to me what we desired of you; for you have made known to us the king’s matter.”"
  }, {
      Id: 1316,
      Name: "Praise",
      Reference: "Psalms 145:1-3",
      Text: "I will exalt you, my God, the King. I will praise your name forever and ever. Every day I will praise you. I will extol your name forever and ever. Great is Yahweh, and greatly to be praised! His greatness is unsearchable."
  }, {
      Id: 1317,
      Name: "Praise",
      Reference: "Psalms 119:164",
      Text: "Seven times a day, I praise you, because of your righteous ordinances."
  }, {
      Id: 1318,
      Name: "Praise",
      Reference: "Psalms 111:1",
      Text: "Praise Yah! I will give thanks to Yahweh with my whole heart, in the council of the upright, and in the congregation."
  }, {
      Id: 1319,
      Name: "Praise",
      Reference: "Psalms 104:33",
      Text: "I will sing to Yahweh as long as I live. I will sing praise to my God while I have any being."
  }, {
      Id: 1320,
      Name: "Praise",
      Reference: "Psalms 95:6",
      Text: "Oh come, let’s worship and bow down.Let’s kneel before Yahweh, our Maker,"
  }, {
      Id: 1321,
      Name: "Praise",
      Reference: "2 Samuel 22:4",
      Text: "I call on Yahweh, who is worthy to be praised; So shall I be saved from my enemies."
  }, {
      Id: 1322,
      Name: "Praise",
      Reference: "Deuteronomy 10:21",
      Text: "He is your praise, and he is your God, who has done for you these great and awesome things which your eyes have seen."
  }, {
      Id: 1323,
      Name: "Praise",
      Reference: "Psalms 119:171",
      Text: "Let my lips utter praise, for you teach me your statutes."
  }, {
      Id: 1324,
      Name: "Praise",
      Reference: "Psalms 66:1-4",
      Text: "Make a joyful shout to God, all the earth! Sing to the glory of his name!Offer glory and praise! Tell God, “How awesome are your deeds!Through the greatness of your power, your enemies submit themselves to you. All the earth will worship you, and will sing to you; they will sing to your name.”"
  }, {
      Id: 1325,
      Name: "Praise",
      Reference: "Psalms 35:18",
      Text: "I will give you thanks in the great assembly. I will praise you among many people."
  }, {
      Id: 1326,
      Name: "Praise",
      Reference: "Ephesians 1:3",
      Text: "Blessed be the God and Father of our Lord Jesus Christ, who has blessed us with every spiritual blessing in the heavenly places in Christ,"
  }, {
      Id: 1327,
      Name: "Praise",
      Reference: "Daniel 4:37",
      Text: "Now I, Nebuchadnezzar, praise and extol and honor the King of heaven; for all his works are truth, and his ways justice; and those who walk in pride he is able to abase."
  }, {
      Id: 1328,
      Name: "Praise",
      Reference: "Psalms 119:175",
      Text: "Let my soul live, that I may praise you. Let your ordinances help me."
  }, {
      Id: 1329,
      Name: "Praise",
      Reference: "Psalms 119:7",
      Text: "I will give thanks to you with uprightness of heart,when I learn your righteous judgments."
  }, {
      Id: 1330,
      Name: "Praise",
      Reference: "Psalms 101:1",
      Text: "I will sing of loving kindness and justice. To you, Yahweh, I will sing praises."
  }, {
      Id: 1331,
      Name: "Praise",
      Reference: "Psalms 28:7",
      Text: "Yahweh is my strength and my shield. My heart has trusted in him, and I am helped. Therefore my heart greatly rejoices. With my song I will thank him."
  }, {
      Id: 1332,
      Name: "Praise",
      Reference: "Psalms 108:1",
      Text: "My heart is steadfast, God.I will sing and I will make music with my soul."
  }, {
      Id: 1333,
      Name: "Praise",
      Reference: "Psalms 71:15",
      Text: "My mouth will tell about your righteousness, and of your salvation all day, though I don’t know its full measure."
  }, {
      Id: 1334,
      Name: "Praise",
      Reference: "Psalms 65:5",
      Text: "By awesome deeds of righteousness, you answer us,God of our salvation. You who are the hope of all the ends of the earth, of those who are far away on the sea."
  }, {
      Id: 1335,
      Name: "Praise",
      Reference: "Isaiah 61:3",
      Text: "to provide for those who mourn in Zion, to give to them a garland for ashes, the oil of joy for mourning, the garment of praise for the spirit of heaviness, that they may be called trees of righteousness, the planting of Yahweh, that he may be glorified."
  }, {
      Id: 1336,
      Name: "Praise",
      Reference: "Psalms 146:1-2",
      Text: "Praise Yah! Praise Yahweh, my soul. While I live, I will praise Yahweh. I will sing praises to my God as long as I exist."
  }, {
      Id: 1337,
      Name: "Praise",
      Reference: "Psalms 103:1",
      Text: "Praise Yahweh, my soul! All that is within me, praise his holy name!"
  }, {
      Id: 1338,
      Name: "Praise",
      Reference: "Psalms 92:1",
      Text: "It is a good thing to give thanks to Yahweh, to sing praises to your name, Most High,"
  }, {
      Id: 1339,
      Name: "Praise",
      Reference: "Psalms 22:3",
      Text: "But you are holy, you who inhabit the praises of Israel."
  }, {
      Id: 1340,
      Name: "Praise",
      Reference: "Nehemiah 9:6",
      Text: "You are Yahweh, even you alone. You have made heaven, the heaven of heavens, with all their army, the earth and all things that are on it, the seas and all that is in them, and you preserve them all. The army of heaven worships you."
  }, {
      Id: 1341,
      Name: "Praise",
      Reference: "Revelation 11:16",
      Text: "The twenty-four elders, who sit on their thrones before God’s throne, fell on their faces and worshiped God,"
  }, {
      Id: 1342,
      Name: "Praise",
      Reference: "Acts 16:25",
      Text: "But about midnight Paul and Silas were praying and singing hymns to God, and the prisoners were listening to them."
  }, {
      Id: 1343,
      Name: "Praise",
      Reference: "Isaiah 42:10-12",
      Text: "Sing to Yahweh a new song, and his praise from the end of the earth, you who go down to the sea, and all that is therein, the islands and their inhabitants. Let the wilderness and its cities raise their voices, with the villages that Kedar inhabits.Let the inhabitants of Sela sing.Let them shout from the top of the mountains! Let them give glory to Yahweh, and declare his praise in the islands."
  }, {
      Id: 1344,
      Name: "Praise",
      Reference: "Psalms 149:3",
      Text: "Let them praise his name in the dance! Let them sing praises to him with tambourine and harp!"
  }, {
      Id: 1345,
      Name: "Praise",
      Reference: "Psalms 119:62",
      Text: "At midnight I will rise to give thanks to you, because of your righteous ordinances."
  }, {
      Id: 1346,
      Name: "Praise",
      Reference: "Psalms 117:1-2",
      Text: "Praise Yahweh, all you nations! Extol him, all you peoples! For his loving kindness is great toward us. Yahweh’s faithfulness endures forever. Praise Yah!"
  }, {
      Id: 1347,
      Name: "Praise",
      Reference: "Psalms 113:1",
      Text: "Praise Yah! Praise, you servants of Yahweh, praise Yahweh’s name. Blessed be Yahweh’s name, from this time forward and forever more. From the rising of the sun to its going down, Yahweh’s name is to be praised."
  }, {
      Id: 1348,
      Name: "Praise",
      Reference: "Psalms 81:1",
      Text: "Sing aloud to God, our strength!Make a joyful shout to the God of Jacob!"
  }, {
      Id: 1349,
      Name: "Praise",
      Reference: "Psalms 150:1",
      Text: "Praise Yah! Praise God in his sanctuary! Praise him in his heavens for his acts of power!"
  }, {
      Id: 1350,
      Name: "Praise",
      Reference: "Psalms 148:4",
      Text: "Praise him, you heavens of heavens, you waters that are above the heavens."
  }, {
      Id: 1351,
      Name: "Praise",
      Reference: "Psalms 148:2",
      Text: "Praise him, all his angels! Praise him, all his army!"
  }, {
      Id: 1352,
      Name: "Praise",
      Reference: "Psalms 139:14",
      Text: "I will give thanks to you, for I am fearfully and wonderfully made. Your works are wonderful. My soul knows that very well."
  }, {
      Id: 1353,
      Name: "Praise",
      Reference: "Psalms 135:1",
      Text: "Praise Yah! Praise Yahweh’s name! Praise him, you servants of Yahweh,"
  }, {
      Id: 1354,
      Name: "Praise",
      Reference: "Psalms 118:1",
      Text: "Give thanks to Yahweh, for he is good, for his loving kindness endures forever."
  }, {
      Id: 1355,
      Name: "Praise",
      Reference: "Psalms 69:34",
      Text: "Let heaven and earth praise him; the seas, and everything that moves therein!"
  }, {
      Id: 1356,
      Name: "Praise",
      Reference: "Psalms 43:4",
      Text: "Then I will go to the altar of God, to God, my exceeding joy. I will praise you on the harp, God, my God."
  }, {
      Id: 1357,
      Name: "Praise",
      Reference: "Psalms 27:1",
      Text: "Yahweh is my light and my salvation. Whom shall I fear? Yahweh is the strength of my life. Of whom shall I be afraid?"
  }, {
      Id: 1358,
      Name: "Praise",
      Reference: "Judges 5:3",
      Text: "“Hear, you kings! Give ear, you princes! I, even I, will sing to Yahweh. I will sing praise to Yahweh, the God of Israel."
  }, {
      Id: 1359,
      Name: "Praise",
      Reference: "Ephesians 3:20",
      Text: "Now to him who is able to do exceedingly abundantly above all that we ask or think, according to the power that works in us,"
  }, {
      Id: 1361,
      Name: "Praise",
      Reference: "Psalms 144:1-2",
      Text: "Blessed be Yahweh, my rock, who trains my hands to war, and my fingers to battle— my loving kindness, my fortress, my high tower, my deliverer, my shield, and he in whom I take refuge,who subdues my people under me."
  }, {
      Id: 1362,
      Name: "Praise",
      Reference: "Psalms 138:1",
      Text: "I will give you thanks with my whole heart. Before the gods, I will sing praises to you."
  }, {
      Id: 1363,
      Name: "Praise",
      Reference: "Psalms 135:21",
      Text: "Blessed be Yahweh from Zion, who dwells in Jerusalem. Praise Yah!"
  }, {
      Id: 1364,
      Name: "Praise",
      Reference: "Psalms 95:1",
      Text: "Oh come, let’s sing to Yahweh.Let’s shout aloud to the rock of our salvation!"
  }, {
      Id: 1365,
      Name: "Praise",
      Reference: "Psalms 56:4",
      Text: "In God, I praise his word. In God, I put my trust. I will not be afraid. What can flesh do to me?"
  }, {
      Id: 1366,
      Name: "Praise",
      Reference: "Psalms 42:11",
      Text: "Why are you in despair, my soul?Why are you disturbed within me?Hope in God! For I shall still praise him, the saving help of my countenance, and my God."
  }, {
      Id: 1367,
      Name: "Praise",
      Reference: "1 Chronicles 16:34",
      Text: "Oh give thanks to Yahweh, for he is good, for his loving kindness endures forever."
  }, {
      Id: 1368,
      Name: "Praise",
      Reference: "Revelation 14:7",
      Text: "He said with a loud voice, “Fear the Lord, and give him glory, for the hour of his judgment has come. Worship him who made the heaven, the earth, the sea, and the springs of waters!”"
  }, {
      Id: 1369,
      Name: "Praise",
      Reference: "Isaiah 35:10",
      Text: "Then Yahweh’s ransomed ones will return, and come with singing to Zion; and everlasting joy will be on their heads. They will obtain gladness and joy, and sorrow and sighing will flee away.”"
  }, {
      Id: 1370,
      Name: "Praise",
      Reference: "Psalms 76:1",
      Text: "In Judah, God is known.His name is great in Israel."
  }, {
      Id: 1371,
      Name: "Praise",
      Reference: "Psalms 68:4",
      Text: "Sing to God! Sing praises to his name!Extol him who rides on the clouds: to Yah, his name! Rejoice before him!"
  }, {
      Id: 1372,
      Name: "Praise",
      Reference: "Psalms 66:4",
      Text: "All the earth will worship you, and will sing to you; they will sing to your name.”"
  }, {
      Id: 1373,
      Name: "Praise",
      Reference: "Psalms 30:11",
      Text: "You have turned my mourning into dancing for me. You have removed my sackcloth, and clothed me with gladness,"
  }, {
      Id: 1374,
      Name: "Intercession",
      Reference: "Romans 8:26",
      Text: "In the same way, the Spirit also helps our weaknesses, for we don’t know how to pray as we ought. But the Spirit himself makes intercession for us with groanings which can’t be uttered.",
    Lie: "If you don't know what to pray, there is nothing you can do."
  }, {
      Id: 1375,
      Name: "Intercession",
      Reference: "Romans 8:27",
      Text: "He who searches the hearts knows what is on the Spirit’s mind, because he makes intercession for the saints according to God.",
    Lie: "You have to figure out what to pray on your own."
  }, {
      Id: 1376,
      Name: "Intercession",
      Reference: "Matthew 6:13",
      Text: "Bring us not into temptation, but deliver us from the evil one.",
    Lie: "God wants you to be tempted and won't deliver you."
  }, {
      Id: 1377,
      Name: "Prophecy",
      Reference: "Amos 3:7",
      Text: "Surely the Lord Yahweh will do nothing, unless he reveals his secret to his servants the prophets."
  }, {
      Id: 1379,
      Name: "Prophecy",
      Reference: "1 Corinthians 14:1",
      Text: "Follow after love and earnestly desire spiritual gifts, but especially that you may prophesy."
  }, {
      Id: 1380,
      Name: "Prophecy",
      Reference: "2 Timothy 3:16",
      Text: "Every Scripture is God-breathed and profitable for teaching, for reproof, for correction, and for instruction in righteousness,"
  }, {
      Id: 1381,
      Name: "Prophecy",
      Reference: "1 John 2:18",
      Text: "Little children, these are the end times, and as you heard that the Antichrist is coming, even now many antichrists have arisen. By this we know that it is the final hour."
  }, {
      Id: 1382,
      Name: "Prophecy",
      Reference: "Isaiah 46:10",
      Text: "I declare the end from the beginning, and from ancient times things that are not yet done. I say: My counsel will stand, and I will do all that I please."
  }, {
      Id: 1383,
      Name: "Prophecy",
      Reference: "Hebrews 8:10-11",
      Text: "“For this is the covenant that I will make with the house of Israel after those days,” says the Lord: “I will put my laws into their mind; I will also write them on their heart. I will be their God, and they will be my people. They will not teach every man his fellow citizen and every man his brother, saying, ‘ Know the Lord,’ for all will know me, from their least to their greatest."
  }, {
      Id: 1384,
      Name: "Prophecy",
      Reference: "1 Corinthians 12:10-11",
      Text: "and to another workings of miracles, and to another prophecy, and to another discerning of spirits, to another different kinds of languages, and to another the interpretation of languages. But the one and the same Spirit produces all of these, distributing to each one separately as he desires."
  }, {
      Id: 1385,
      Name: "Prophecy",
      Reference: "1 Corinthians 13:2",
      Text: "If I have the gift of prophecy, and know all mysteries and all knowledge, and if I have all faith, so as to remove mountains, but don’t have love, I am nothing."
  }, {
      Id: 1386,
      Name: "Prophecy",
      Reference: "Luke 1:33",
      Text: "and he will reign over the house of Jacob forever. There will be no end to his Kingdom.”"
  }, {
      Id: 1387,
      Name: "Prophecy",
      Reference: "1 John 4:1",
      Text: "Beloved, don’t believe every spirit, but test the spirits, whether they are of God, because many false prophets have gone out into the world."
  }, {
      Id: 1388,
      Name: "Prophecy",
      Reference: "Hebrews 1:9",
      Text: "You have loved righteousness and hated iniquity; therefore God, your God, has anointed you with the oil of gladness above your fellows.”"
  }, {
      Id: 1389,
      Name: "Prophecy",
      Reference: "Ephesians 2:19-20",
      Text: "So then you are no longer strangers and foreigners, but you are fellow citizens with the saints and of the household of God, being built on the foundation of the apostles and prophets, Christ Jesus himself being the chief cornerstone;"
  }, {
      Id: 1390,
      Name: "Prophecy",
      Reference: "Matthew 1:22-23",
      Text: "Now all this has happened that it might be fulfilled which was spoken by the Lord through the prophet, saying, “Behold, the virgin shall be with child, and shall give birth to a son. They shall call his name Immanuel,” which is, being interpreted, “God with us.”"
  }, {
      Id: 1391,
      Name: "Prophecy",
      Reference: "Isaiah 53:12",
      Text: "Therefore I will give him a portion with the great. He will divide the plunder with the strong, because he poured out his soul to death and was counted with the transgressors; yet he bore the sins of many and made intercession for the transgressors."
  }, {
      Id: 1392,
      Name: "Prophecy",
      Reference: "Psalms 22:1",
      Text: "My God, my God, why have you forsaken me?Why are you so far from helping me, and from the words of my groaning?"
  }, {
      Id: 1393,
      Name: "Prophecy",
      Reference: "Luke 4:18",
      Text: "“The Spirit of the Lord is on me, because he has anointed me to preach good news to the poor. He has sent me to heal the broken hearted, to proclaim release to the captives,recovering of sight to the blind, to deliver those who are crushed,"
  }, {
      Id: 1394,
      Name: "Prophecy",
      Reference: "Mark 14:27",
      Text: "Jesus said to them, “All of you will be made to stumble because of me tonight, for it is written, ‘I will strike the shepherd, and the sheep will be scattered.’"
  }, {
      Id: 1395,
      Name: "Prophecy",
      Reference: "Hosea 6:2",
      Text: "After two days he will revive us. On the third day he will raise us up, and we will live before him."
  }, {
      Id: 1396,
      Name: "Prophecy",
      Reference: "Acts 13:33",
      Text: "that God has fulfilled this to us, their children, in that he raised up Jesus. As it is also written in the second psalm, ‘You are my Son. Today I have become your father.’"
  }, {
      Id: 1397,
      Name: "Prophecy",
      Reference: "John 19:28",
      Text: "After this, Jesus, seeing that all things were now finished, that the Scripture might be fulfilled, said,“I am thirsty!”"
  }, {
      Id: 1398,
      Name: "Prophecy",
      Reference: "Luke 2:32",
      Text: "a light for revelation to the nations, and the glory of your people Israel.”"
  }, {
      Id: 1399,
      Name: "Prophecy",
      Reference: "Jeremiah 23:5",
      Text: "“Behold, the days come,” says Yahweh,“that I will raise to David a righteous Branch; and he will reign as king and deal wisely, and will execute justice and righteousness in the land."
  }, {
      Id: 1400,
      Name: "Prophecy",
      Reference: "Isaiah 53:9",
      Text: "They made his grave with the wicked, and with a rich man in his death, although he had done no violence, nor was any deceit in his mouth."
  }, {
      Id: 1401,
      Name: "Prophecy",
      Reference: "Psalms 22:18",
      Text: "They divide my garments among them. They cast lots for my clothing."
  }, {
      Id: 1402,
      Name: "Prophecy",
      Reference: "Jude 1:17",
      Text: "But you, beloved, remember the words which have been spoken before by the apostles of our Lord Jesus Christ."
  }, {
      Id: 1403,
      Name: "Prophecy",
      Reference: "John 19:37",
      Text: "Again another Scripture says, “They will look on him whom they pierced.”"
  }, {
      Id: 1404,
      Name: "Prophecy",
      Reference: "Luke 20:42",
      Text: "David himself says in the book of Psalms, `The Lord said to my Lord,“Sit at my right hand,"
  }, {
      Id: 1405,
      Name: "Prophecy",
      Reference: "Matthew 7:15",
      Text: "“Beware of false prophets, who come to you in sheep’s clothing, but inwardly are ravening wolves."
  }, {
      Id: 1406,
      Name: "Prophecy",
      Reference: "Acts 26:23",
      Text: "how the Christ must suffer, and how, by the resurrection of the dead, he would be first to proclaim light both to these people and to the Gentiles.”"
  }, {
      Id: 1407,
      Name: "Prophecy",
      Reference: "Acts 15:17",
      Text: "that the rest of men may seek after the Lord: all the Gentiles who are called by my name, says the Lord, who does all these things.’"
  }, {
      Id: 1408,
      Name: "Prophecy",
      Reference: "Jeremiah 31:15",
      Text: "Yahweh says:“A voice is heard in Ramah, lamentation and bitter weeping, Rachel weeping for her children. She refuses to be comforted for her children, because they are no more.”"
  }, {
      Id: 1409,
      Name: "Prophecy",
      Reference: "Revelation 1:7",
      Text: "Behold, he is coming with the clouds, and every eye will see him, including those who pierced him. All the tribes of the earth will mourn over him. Even so, Amen."
  }, {
      Id: 1410,
      Name: "Prophecy",
      Reference: "1 Thessalonians 5:21-22",
      Text: "Test all things, and hold firmly that which is good. Abstain from every form of evil."
  }, {
      Id: 1411,
      Name: "Prophecy",
      Reference: "Acts 3:25",
      Text: "You are the children of the prophets, and of the covenant which God made with our fathers, saying to Abraham, ‘All the families of the earth will be blessed through your offspring.’"
  }, {
      Id: 1412,
      Name: "Prophecy",
      Reference: "Isaiah 53:3",
      Text: "He was despised and rejected by men, a man of suffering and acquainted with disease. He was despised as one from whom men hide their face; and we didn’t respect him."
  }, {
      Id: 1413,
      Name: "Prophecy",
      Reference: "Deuteronomy 18:21-22",
      Text: "You may say in your heart, “How shall we know the word which Yahweh has not spoken?” When a prophet speaks in Yahweh’s name, if the thing doesn’t follow, nor happen, that is the thing which Yahweh has not spoken. The prophet has spoken it presumptuously. You shall not be afraid of him."
  }, {
      Id: 1414,
      Name: "Prophecy",
      Reference: "Luke 1:17",
      Text: "He will go before him in the spirit and power of Elijah, ‘to turn the hearts of the fathers to the children,’ and the disobedient to the wisdom of the just; to prepare a people prepared for the Lord.”"
  }, {
      Id: 1415,
      Name: "Prophecy",
      Reference: "2 Kings 20:5",
      Text: "“Turn back, and tell Hezekiah the prince of my people, ‘Yahweh, the God of David your father, says, “I have heard your prayer. I have seen your tears. Behold, I will heal you. On the third day, you will go up to Yahweh’s house."
  }, {
      Id: 1416,
      Name: "Prophecy",
      Reference: "Galatians 4:4",
      Text: "But when the fullness of the time came, God sent out his Son, born to a woman, born under the law,"
  }, {
      Id: 1417,
      Name: "Prophecy",
      Reference: "1 Corinthians 14:31",
      Text: "For you all can prophesy one by one, that all may learn and all may be exhorted."
  }, {
      Id: 1418,
      Name: "Prophecy",
      Reference: "Acts 2:31",
      Text: "he foreseeing this, spoke about the resurrection of the Christ, that his soul wasn’t left in Hades, and his flesh didn’t see decay."
  }, {
      Id: 1419,
      Name: "Prophecy",
      Reference: "Acts 2:17",
      Text: "‘It will be in the last days, says God, that I will pour out my Spirit on all flesh. Your sons and your daughters will prophesy. Your young men will see visions. Your old men will dream dreams."
  }, {
      Id: 1420,
      Name: "Prophecy",
      Reference: "John 6:45",
      Text: "It is written in the prophets, ‘They will all be taught by God.’ Therefore everyone who hears from the Father and has learned, comes to me."
  }, {
      Id: 1421,
      Name: "Prophecy",
      Reference: "Luke 23:46",
      Text: "Jesus, crying with a loud voice, said, “Father, into your hands I commit my spirit!” Having said this, he breathed his last."
  }, {
      Id: 1422,
      Name: "Prophecy",
      Reference: "Matthew 27:46",
      Text: "About the ninth hour Jesus cried with a loud voice, saying,“Eli, Eli, lima sabachthani?” That is,“My God, my God, why have you forsaken me?”"
  }, {
      Id: 1423,
      Name: "Endurance",
      Reference: "Romans 5:3-4",
      Text: "Not only this, but we also rejoice in our sufferings, knowing that suffering produces perseverance; and perseverance, proven character; and proven character, hope;"
  }, {
      Id: 1424,
      Name: "Endurance",
      Reference: "James 1:12-18",
      Text: "Blessed is a person who endures temptation, for when he has been approved, he will receive the crown of life which the Lord promised to those who love him."
  }, {
      Id: 1425,
      Name: "Endurance",
      Reference: "Hebrews 10:36",
      Text: "For you need endurance so that, having done the will of God, you may receive the promise."
  }, {
      Id: 1426,
      Name: "Endurance",
      Reference: "James 1:2-4",
      Text: "Count it all joy, my brothers, when you fall into various temptations, knowing that the testing of your faith produces endurance. Let endurance have its perfect work, that you may be perfect and complete, lacking in nothing."
  }, {
      Id: 1427,
      Name: "Endurance",
      Reference: "James 1:12",
      Text: "Blessed is a person who endures temptation, for when he has been approved, he will receive the crown of life which the Lord promised to those who love him."
  }, {
      Id: 1428,
      Name: "Endurance",
      Reference: "Colossians 1:11",
      Text: "strengthened with all power, according to the might of his glory, for all endurance and perseverance with joy,"
  }, {
      Id: 1429,
      Name: "Endurance",
      Reference: "Romans 12:12",
      Text: "rejoicing in hope, enduring in troubles, continuing steadfastly in prayer,"
  }, {
      Id: 1430,
      Name: "Endurance",
      Reference: "1 Corinthians 10:13",
      Text: "No temptation has taken you except what is common to man. God is faithful, who will not allow you to be tempted above what you are able, but will with the temptation also make the way of escape, that you may be able to endure it."
  }, {
      Id: 1431,
      Name: "Endurance",
      Reference: "Hebrews 12:1-3",
      Text: "Therefore let’s also, seeing we are surrounded by so great a cloud of witnesses, lay aside every weight and the sin which so easily entangles us, and let’s run with perseverance the race that is set before us, looking to Jesus, the author and perfecter of faith, who for the joy that was set before him endured the cross, despising its shame, and has sat down at the right hand of the throne of God. For consider him who has endured such contradiction of sinners against himself, that you don’t grow weary, fainting in your souls."
  }, {
      Id: 1432,
      Name: "Endurance",
      Reference: "James 1:4",
      Text: "Let endurance have its perfect work, that you may be perfect and complete, lacking in nothing."
  }, {
      Id: 1433,
      Name: "Endurance",
      Reference: "Romans 15:4",
      Text: "For whatever things were written before were written for our learning, that through perseverance and through encouragement of the Scriptures we might have hope."
  }, {
      Id: 1434,
      Name: "Endurance",
      Reference: "James 5:11",
      Text: "Behold, we call them blessed who endured. You have heard of the perseverance of Job and have seen the Lord in the outcome, and how the Lord is full of compassion and mercy."
  }, {
      Id: 1435,
      Name: "Endurance",
      Reference: "Romans 8:28",
      Text: "We know that all things work together for good for those who love God, for those who are called according to his purpose."
  }, {
      Id: 1436,
      Name: "Endurance",
      Reference: "Philippians 4:13",
      Text: "I can do all things through Christ who strengthens me."
  }, {
      Id: 1437,
      Name: "Endurance",
      Reference: "Romans 15:4-5",
      Text: "For whatever things were written before were written for our learning, that through perseverance and through encouragement of the Scriptures we might have hope. Now the God of perseverance and of encouragement grant you to be of the same mind with one another according to Christ Jesus,"
  }, {
      Id: 1438,
      Name: "Endurance",
      Reference: "Romans 15:5",
      Text: "Now the God of perseverance and of encouragement grant you to be of the same mind with one another according to Christ Jesus,"
  }, {
      Id: 1439,
      Name: "Endurance",
      Reference: "Hebrews 12:7",
      Text: "It is for discipline that you endure. God deals with you as with children, for what son is there whom his father doesn’t discipline?"
  }, {
      Id: 1440,
      Name: "Endurance",
      Reference: "John 16:33",
      Text: "I have told you these things, that in me you may have peace. In the world you have trouble; but cheer up! I have overcome the world.”"
  }, {
      Id: 1441,
      Name: "Endurance",
      Reference: "Hebrews 12:1-2",
      Text: "Therefore let’s also, seeing we are surrounded by so great a cloud of witnesses, lay aside every weight and the sin which so easily entangles us, and let’s run with perseverance the race that is set before us, looking to Jesus, the author and perfecter of faith, who for the joy that was set before him endured the cross, despising its shame, and has sat down at the right hand of the throne of God."
  }, {
      Id: 1442,
      Name: "Endurance",
      Reference: "1 Corinthians 9:24",
      Text: "Don’t you know that those who run in a race all run, but one receives the prize? Run like that, so that you may win."
  }, {
      Id: 1443,
      Name: "Endurance",
      Reference: "1 Peter 5:8",
      Text: "Be sober and self-controlled. Be watchful. Your adversary, the devil, walks around like a roaring lion, seeking whom he may devour."
  }, {
      Id: 1444,
      Name: "Endurance",
      Reference: "Romans 15:13",
      Text: "Now may the God of hope fill you with all joy and peace in believing, that you may abound in hope in the power of the Holy Spirit."
  }, {
      Id: 1445,
      Name: "Endurance",
      Reference: "James 1:25",
      Text: "But he who looks into the perfect law of freedom and continues, not being a hearer who forgets but a doer of the work, this man will be blessed in what he does."
  }, {
      Id: 1446,
      Name: "Endurance",
      Reference: "1 Peter 4:12",
      Text: "Beloved, don’t be astonished at the fiery trial which has come upon you to test you, as though a strange thing happened to you."
  }, {
      Id: 1447,
      Name: "Endurance",
      Reference: "Hebrews 12:2",
      Text: "looking to Jesus, the author and perfecter of faith, who for the joy that was set before him endured the cross, despising its shame, and has sat down at the right hand of the throne of God."
  }, {
      Id: 1448,
      Name: "Endurance",
      Reference: "Galatians 6:9",
      Text: "Let’s not be weary in doing good, for we will reap in due season if we don’t give up."
  }, {
      Id: 1449,
      Name: "Endurance",
      Reference: "Isaiah 40:31",
      Text: "but those who wait for Yahweh will renew their strength. They will mount up with wings like eagles. They will run, and not be weary. They will walk, and not faint."
  }, {
      Id: 1450,
      Name: "Endurance",
      Reference: "2 Thessalonians 3:5",
      Text: "May the Lord direct your hearts into God’s love and into the perseverance of Christ."
  }, {
      Id: 1451,
      Name: "Endurance",
      Reference: "Revelation 3:10",
      Text: "Because you kept my command to endure, I also will keep you from the hour of testing which is to come on the whole world, to test those who dwell on the earth."
  }, {
      Id: 1452,
      Name: "Endurance",
      Reference: "2 Timothy 3:10-12",
      Text: "But you followed my teaching, conduct, purpose, faith, patience, love, steadfastness, persecutions, and sufferings— those things that happened to me at Antioch, Iconium, and Lystra. I endured those persecutions. The Lord delivered me out of them all. Yes, and all who desire to live godly in Christ Jesus will suffer persecution."
  }, {
      Id: 1453,
      Name: "Endurance",
      Reference: "Romans 2:7",
      Text: "to those who by perseverance in well-doing seek for glory, honor, and incorruptibility, eternal life;"
  }, {
      Id: 1454,
      Name: "Endurance",
      Reference: "Colossians 2:8",
      Text: "Be careful that you don’t let anyone rob you through his philosophy and vain deceit, after the tradition of men, after the elemental spirits of the world, and not after Christ."
  }, {
      Id: 1455,
      Name: "Endurance",
      Reference: "John 8:32",
      Text: "You will know the truth, and the truth will make you free.”"
  }, {
      Id: 1456,
      Name: "Endurance",
      Reference: "2 Corinthians 4:16-18",
      Text: "Therefore we don’t faint, but though our outward person is decaying, yet our inward person is renewed day by day. For our light affliction, which is for the moment, works for us more and more exceedingly an eternal weight of glory, while we don’t look at the things which are seen, but at the things which are not seen. For the things which are seen are temporal, but the things which are not seen are eternal."
  }, {
      Id: 1457,
      Name: "Endurance",
      Reference: "Matthew 24:13",
      Text: "But he who endures to the end will be saved."
  }, {
      Id: 1458,
      Name: "Endurance",
      Reference: "James 1:3",
      Text: "knowing that the testing of your faith produces endurance."
  }, {
      Id: 1459,
      Name: "Endurance",
      Reference: "Romans 5:3",
      Text: "Not only this, but we also rejoice in our sufferings, knowing that suffering produces perseverance;"
  }, {
      Id: 1460,
      Name: "Endurance",
      Reference: "Psalms 23:1-6",
      Text: "Yahweh is my shepherd; I shall lack nothing. He makes me lie down in green pastures. He leads me beside still waters. He restores my soul. He guides me in the paths of righteousness for his name’s sake. Even though I walk through the valley of the shadow of death, I will fear no evil, for you are with me. Your rod and your staff, they comfort me. You prepare a table before me in the presence of my enemies. You anoint my head with oil. My cup runs over. Surely goodness and loving kindness shall follow me all the days of my life, and I will dwell in Yahweh’s house forever."
  }, {
      Id: 1461,
      Name: "Endurance",
      Reference: "1 Peter 2:20",
      Text: "For what glory is it if, when you sin, you patiently endure beating? But if when you do well, you patiently endure suffering, this is commendable with God."
  }, {
      Id: 1462,
      Name: "Endurance",
      Reference: "James 5:7-8",
      Text: "Be patient therefore, brothers, until the coming of the Lord. Behold, the farmer waits for the precious fruit of the earth, being patient over it, until it receives the early and late rain. You also be patient. Establish your hearts, for the coming of the Lord is at hand."
  }, {
      Id: 1463,
      Name: "Endurance",
      Reference: "2 Corinthians 6:4",
      Text: "but in everything commending ourselves as servants of God: in great endurance, in afflictions, in hardships, in distresses,"
  }, {
      Id: 1464,
      Name: "Endurance",
      Reference: "2 Timothy 3:10",
      Text: "But you followed my teaching, conduct, purpose, faith, patience, love, steadfastness,"
  }, {
      Id: 1465,
      Name: "Endurance",
      Reference: "Luke 9:24",
      Text: "For whoever desires to save his life will lose it, but whoever will lose his life for my sake will save it."
  }, {
      Id: 1466,
      Name: "Endurance",
      Reference: "Romans 8:24-25",
      Text: "For we were saved in hope, but hope that is seen is not hope. For who hopes for that which he sees? But if we hope for that which we don’t see, we wait for it with patience."
  }, {
      Id: 1467,
      Name: "Endurance",
      Reference: "Matthew 12:36-37",
      Text: "I tell you that every idle word that men speak, they will give account of it in the day of judgment. For by your words you will be justified, and by your words you will be condemned.”"
  }, {
      Id: 1468,
      Name: "Endurance",
      Reference: "2 Peter 3:9",
      Text: "The Lord is not slow concerning his promise, as some count slowness; but he is patient with us, not wishing that anyone should perish, but that all should come to repentance."
  }, {
      Id: 1469,
      Name: "Endurance",
      Reference: "Revelation 1:9",
      Text: "I John, your brother and partner with you in the oppression, Kingdom, and perseverance in Christ Jesus, was on the isle that is called Patmos because of God’s Word and the testimony of Jesus Christ."
  }, {
      Id: 1470,
      Name: "Endurance",
      Reference: "James 1:1-4",
      Text: "Count it all joy, my brothers, when you fall into various temptations, knowing that the testing of your faith produces endurance. Let endurance have its perfect work, that you may be perfect and complete, lacking in nothing."
  }, {
      Id: 1471,
      Name: "Endurance",
      Reference: "2 Timothy 4:7",
      Text: "I have fought the good fight. I have finished the course. I have kept the faith."
  }, {
      Id: 1472,
      Name: "Endurance",
      Reference: "John 14:1",
      Text: "Don’t let your heart be troubled. Believe in God. Believe also in me."
  }, {
      Id: 1473,
      Name: "Endurance",
      Reference: "Revelation 14:12",
      Text: "Here is the perseverance of the saints, those who keep the commandments of God and the faith of Jesus.”"
  }, {
      Id: 1474,
      Name: "Endurance",
      Reference: "Hebrews 6:12",
      Text: "that you won’t be sluggish, but imitators of those who through faith and perseverance inherited the promises."
  }, {
      Id: 1475,
      Name: "Endurance",
      Reference: "Revelation 13:10",
      Text: "If anyone is to go into captivity, he will go into captivity. If anyone is to be killed with the sword, he must be killed. Here is the endurance and the faith of the saints."
  }, {
      Id: 1476,
      Name: "Endurance",
      Reference: "Hebrews 6:15",
      Text: "Thus, having patiently endured, he obtained the promise."
  }, {
      Id: 1477,
      Name: "Endurance",
      Reference: "2 Thessalonians 1:4",
      Text: "so that we ourselves boast about you in the assemblies of God for your perseverance and faith in all your persecutions and in the afflictions which you endure."
  }, {
      Id: 1478,
      Name: "Endurance",
      Reference: "Ephesians 6:17",
      Text: "And take the helmet of salvation, and the sword of the Spirit, which is the word of God;"
  }, {
      Id: 1479,
      Name: "Endurance",
      Reference: "Acts 1:8",
      Text: "But you will receive power when the Holy Spirit has come upon you. You will be witnesses to me in Jerusalem, in all Judea and Samaria, and to the uttermost parts of the earth.”"
  }, {
      Id: 1480,
      Name: "Endurance",
      Reference: "1 John 4:1",
      Text: "Beloved, don’t believe every spirit, but test the spirits, whether they are of God, because many false prophets have gone out into the world."
  }, {
      Id: 1481,
      Name: "Endurance",
      Reference: "Hebrews 11:36",
      Text: "Others were tried by mocking and scourging, yes, moreover by bonds and imprisonment."
  }, {
      Id: 1482,
      Name: "Endurance",
      Reference: "1 Timothy 6:11",
      Text: "But you, man of God, flee these things, and follow after righteousness, godliness, faith, love, perseverance, and gentleness."
  }, {
      Id: 1483,
      Name: "Endurance",
      Reference: "2 Corinthians 1:6",
      Text: "But if we are afflicted, it is for your comfort and salvation. If we are comforted, it is for your comfort, which produces in you the patient enduring of the same sufferings which we also suffer."
  }, {
      Id: 1484,
      Name: "Endurance",
      Reference: "John 8:47",
      Text: "He who is of God hears the words of God. For this cause you don’t hear, because you are not of God.”"
  }, {
      Id: 1485,
      Name: "Endurance",
      Reference: "Psalms 119:18",
      Text: "Open my eyes, that I may see wondrous things out of your law."
  }, {
      Id: 1486,
      Name: "Endurance",
      Reference: "Romans 12:2",
      Text: "Don’t be conformed to this world, but be transformed by the renewing of your mind, so that you may prove what is the good, well-pleasing, and perfect will of God."
  }, {
      Id: 1487,
      Name: "Endurance",
      Reference: "Romans 5:1-5",
      Text: "Being therefore justified by faith, we have peace with God through our Lord Jesus Christ; through whom we also have our access by faith into this grace in which we stand. We rejoice in hope of the glory of God. Not only this, but we also rejoice in our sufferings, knowing that suffering produces perseverance; and perseverance, proven character; and proven character, hope; and hope doesn’t disappoint us, because God’s love has been poured into our hearts through the Holy Spirit who was given to us."
  }, {
      Id: 1488,
      Name: "Endurance",
      Reference: "Revelation 2:19",
      Text: "“I know your works, your love, faith, service, patient endurance, and that your last works are more than the first."
  }, {
      Id: 1489,
      Name: "Endurance",
      Reference: "2 Timothy 2:10",
      Text: "Therefore I endure all things for the chosen ones’ sake, that they also may obtain the salvation which is in Christ Jesus with eternal glory."
  }, {
      Id: 1490,
      Name: "Endurance",
      Reference: "Matthew 5:10",
      Text: "Blessed are those who have been persecuted for righteousness’ sake, for theirs is the Kingdom of Heaven."
  }, {
      Id: 1491,
      Name: "Endurance",
      Reference: "Hebrews 13:22",
      Text: "But I exhort you, brothers, endure the word of exhortation, for I have written to you in few words."
  }, {
      Id: 1492,
      Name: "Endurance",
      Reference: "Psalms 119:105",
      Text: "Your word is a lamp to my feet, and a light for my path."
  }, {
      Id: 1493,
      Name: "Endurance",
      Reference: "Psalms 100:5",
      Text: "For Yahweh is good. His loving kindness endures forever, his faithfulness to all generations."
  }, {
      Id: 1494,
      Name: "Endurance",
      Reference: "Revelation 2:2-3",
      Text: "“I know your works, and your toil and perseverance, and that you can’t tolerate evil men, and have tested those who call themselves apostles, and they are not, and found them false. You have perseverance and have endured for my name’s sake, and have not grown weary."
  }, {
      Id: 1495,
      Name: "Endurance",
      Reference: "James 5:10-11",
      Text: "Take, brothers, for an example of suffering and of perseverance, the prophets who spoke in the name of the Lord. Behold, we call them blessed who endured. You have heard of the perseverance of Job and have seen the Lord in the outcome, and how the Lord is full of compassion and mercy."
  }, {
      Id: 1496,
      Name: "Endurance",
      Reference: "Hebrews 4:12",
      Text: "For the word of God is living and active, and sharper than any two-edged sword, piercing even to the dividing of soul and spirit, of both joints and marrow, and is able to discern the thoughts and intentions of the heart."
  }, {
      Id: 1497,
      Name: "Endurance",
      Reference: "1 Thessalonians 1:3",
      Text: "remembering without ceasing your work of faith and labor of love and perseverance of hope in our Lord Jesus Christ, before our God and Father."
  }, {
      Id: 1498,
      Name: "Endurance",
      Reference: "Ephesians 6:10-11",
      Text: "Finally, be strong in the Lord and in the strength of his might. Put on the whole armor of God, that you may be able to stand against the wiles of the devil."
  }, {
      Id: 1499,
      Name: "Endurance",
      Reference: "1 Corinthians 6:9-11",
      Text: "Or don’t you know that the unrighteous will not inherit God’s Kingdom? Don’t be deceived. Neither the sexually immoral, nor idolaters, nor adulterers, nor male prostitutes, nor homosexuals, nor thieves, nor covetous, nor drunkards, nor slanderers, nor extortionists, will inherit God’s Kingdom. Some of you were such, but you were washed. You were sanctified. You were justified in the name of the Lord Jesus, and in the Spirit of our God."
  }, {
      Id: 1500,
      Name: "Endurance",
      Reference: "John 15:4-6",
      Text: "Remain in me, and I in you. As the branch can’t bear fruit by itself unless it remains in the vine, so neither can you, unless you remain in me. I am the vine. You are the branches. He who remains in me and I in him bears much fruit, for apart from me you can do nothing. If a man doesn’t remain in me, he is thrown out as a branch and is withered; and they gather them, throw them into the fire, and they are burned."
  }, {
      Id: 1501,
      Name: "Endurance",
      Reference: "Ephesians 6:18",
      Text: "with all prayer and requests, praying at all times in the Spirit, and being watchful to this end in all perseverance and requests for all the saints."
  }, {
      Id: 1502,
      Name: "Endurance",
      Reference: "Galatians 5:19-21",
      Text: "Now the deeds of the flesh are obvious, which are: adultery, sexual immorality, uncleanness, lustfulness, idolatry, sorcery, hatred, strife, jealousies, outbursts of anger, rivalries, divisions, heresies, envy, murders, drunkenness, orgies, and things like these; of which I forewarn you, even as I also forewarned you, that those who practice such things will not inherit God’s Kingdom."
  }, {
      Id: 1503,
      Name: "Endurance",
      Reference: "2 Corinthians 12:12",
      Text: "Truly the signs of an apostle were worked among you in all perseverance, in signs and wonders and mighty works."
  }, {
      Id: 1504,
      Name: "Endurance",
      Reference: "Mark 13:13",
      Text: "You will be hated by all men for my name’s sake, but he who endures to the end will be saved."
  }, {
      Id: 1505,
      Name: "Endurance",
      Reference: "Isaiah 41:10",
      Text: "Don’t you be afraid, for I am with you. Don’t be dismayed, for I am your God. I will strengthen you. Yes, I will help you. Yes, I will uphold you with the right hand of my righteousness."
  }, {
      Id: 1506,
      Name: "Endurance",
      Reference: "Proverbs 13:4",
      Text: "The soul of the sluggard desires, and has nothing, but the desire of the diligent shall be fully satisfied."
  }, {
      Id: 1507,
      Name: "Endurance",
      Reference: "James 1:2-3",
      Text: "Count it all joy, my brothers, when you fall into various temptations, knowing that the testing of your faith produces endurance."
  }, {
      Id: 1508,
      Name: "Endurance",
      Reference: "Romans 5:4",
      Text: "and perseverance, proven character; and proven character, hope;"
  }, {
      Id: 1509,
      Name: "Endurance",
      Reference: "Matthew 4:4",
      Text: "But he answered, “It is written, ‘Man shall not live by bread alone, but by every word that proceeds out of God’s mouth.’”"
  }, {
      Id: 1510,
      Name: "Endurance",
      Reference: "1 Timothy 4:1",
      Text: "But the Spirit says expressly that in later times some will fall away from the faith, paying attention to seducing spirits and doctrines of demons,"
  }, {
      Id: 1511,
      Name: "Endurance",
      Reference: "Luke 21:34",
      Text: "“So be careful, or your hearts will be loaded down with carousing, drunkenness, and cares of this life, and that day will come on you suddenly."
  }, {
      Id: 1512,
      Name: "Endurance",
      Reference: "Luke 21:19",
      Text: "“By your endurance you will win your lives."
  }, {
      Id: 1513,
      Name: "Endurance",
      Reference: "Hebrews 12:3",
      Text: "For consider him who has endured such contradiction of sinners against himself, that you don’t grow weary, fainting in your souls."
  }, {
      Id: 1514,
      Name: "Endurance",
      Reference: "1 Corinthians 9:21",
      Text: "to those who are without law, as without law ( not being without law toward God, but under law toward Christ), that I might win those who are without law."
  }, {
      Id: 1515,
      Name: "Endurance",
      Reference: "1 Corinthians 1:8",
      Text: "who will also confirm you until the end, blameless in the day of our Lord Jesus Christ."
  }, {
      Id: 1516,
      Name: "Endurance",
      Reference: "John 6:33",
      Text: "For the bread of God is that which comes down out of heaven and gives life to the world.”"
  }, {
      Id: 1517,
      Name: "Endurance",
      Reference: "Exodus 4:15",
      Text: "You shall speak to him, and put the words in his mouth. I will be with your mouth, and with his mouth, and will teach you what you shall do."
  }, {
      Id: 1518,
      Name: "Endurance",
      Reference: "John 15:20",
      Text: "Remember the word that I said to you: ‘A servant is not greater than his lord.’ If they persecuted me, they will also persecute you. If they kept my word, they will also keep yours."
  }, {
      Id: 1520,
      Name: "Good News",
      Reference: "John 10:10",
      Text: "The thief only comes to steal, kill, and destroy. I came that they may have life, and may have it abundantly.",
    Audio: "John10v10",
    NPCSays: ["Maybe the devil isn't such a bad guy.", "The LORD Jesus is a killjoy."],
    Lie: "Evil is fun. Being good is boring."
  }, {
      Id: 1521,
      Name: "Good News",
      Reference: "John 3:17",
      Text: "For God didn’t send his Son into the world to judge the world, but that the world should be saved through him.",
    Audio: "John3v17-JF",
    NPCSays: ["God just wants to condemn people and send as many as possible to hell.", "God doesn't have a Son.", "People don't need salvation.", "Everyone can find their own path to God."],
    Lie: "God doesn't want to save you."
  }, {
      Id: 1522,
      Name: "Good News",
      Reference: "Romans 3:23",
      Text: "for all have sinned, and fall short of the glory of God;",
    Audio: "Rom3v23-Hala",
    NPCSays: ["I've never sinned.","People are basically good."],
    Lie: "People are basically good. Sin is a concept made to control people."
  }, {
      Id: 1523,
      Name: "Good News",
      Reference: "Romans 6:23",
      Text: "For the wages of sin is death, but the free gift of God is eternal life in Christ Jesus our Lord.",
    Lie: "Go on. Sin. You will not surely die.",
    Audio: "Rom6v23-JF",
    NPCSays: ["We all sin, it is no big deal.", "Even if you give yourself to sin, you won't go to hell.","God expects us to work for our acceptance with him.", "There is no such thing as eternal life.", "Salvation comes from within yourself."]
  }, 
  {
      Id: 1524,
      Name: "Good News",
      Reference: "Matthew 1:21",
      Text: "She shall give birth to a son. You shall name him Jesus, for it is he who shall save his people FROM their sins.",
    Lie: "Every human is a slave to sin and there is no escape.",
    Audio: "Matt1v21-Hala",
    NPCSays: ["Jesus saves people in their sins.", "Jesus was an alien from another planet."]
  }, 
  
  {
      Id: 1525,
      Name: "Good News",
      Reference: "1 Peter 3:18",
      Text: "Because Christ also suffered for sins once, the righteous for the unrighteous, that he might bring you to God.",
    Audio: "1Peter3v18-JF",
    Lie: "Jesus never died on the cross.",
    NPCSays: ["It wasn't Jesus Christ who died on the cross, just someone who looked like him.", "We can't really know God through what Jesus did on the cross."]
  }, {
      Id: 1526,
      Name: "Good News",
      Reference: "John 3:16",
      Text: "For God so loved the world, that he gave his only born Son, that whoever believes in him should not perish, but have eternal life.",
    Audio: "John3v16-HF",
    NPCSays: ["Does God really love me?", "You don't have to believe in Jesus to go to heaven.", "God doesn't have a Son.", "There is no danger of perishing eternally."],
    Lie: "God doesn't love the world."
  }, {
      Id: 1527,
      Name: "Good News",
      Reference: "1 Corinthians 15:3-4",
      Text: "For I delivered to you first of all that which I also received: that Christ died for our sins according to the Scriptures, that he was buried, that he was raised on the third day according to the Scriptures.",
    Audio: "1Cor15v3-4JF",
    NPCSays: ["Jesus died as an example to us and not as a sacrifice for sins.","Jesus never rose from the dead", "Jesus only rose spiritually from the dead", "The Scriptures never said that Jesus would rise from the dead."],
    Lie: "There is no historical evidence for the so-called resurrection."
  }, {
      Id: 1528,
      Name: "Good News",
      Reference: "John 14:6",
      Text: "Jesus said to him, “I am the way, the truth, and the life. No one comes to the Father, except through me.",
    Audio: "John14v6-HF",
    NPCSays: ["There are many ways to God.", "Jesus is not the only way to God."],
    Lie: "There are many ways to God."
  }, {
      Id: 1529,
      Name: "Good News",
      Reference: "John 10:9",
      Text: "I am the door. If anyone enters in by me, he will be saved, and will go in and go out and will find pasture.",
    Audio: "John10v9-O",
    NPCSays: ["Jesus does not provide for people who come to him.", "Jesus does not promise salvation to people who come to him."],
    Lie: "There is no real promise of salvation from God."
  }, {
      Id: 1530,
      Name: "Good News",
      Reference: "Isaiah 55:7",
      Text: "Let the wicked forsake his way, and the unrighteous man his thoughts. Let him return to Yahweh, and he will have mercy on him, to our God, for he will freely pardon.",
    Audio: "Is55v7-Jacob",
    NPCSays: ["You can keep on being wicked and it will be OK.", "Thoughts don't matter, it is only what you do and say that counts.", "God is reluctant to forgive and pardon and show mercy to sinners."],
    Lie: "You have done too much wrong to ever be forgiven by God."
  }, {
      Id: 1531,
      Name: "Good News",
      Reference: "Luke 24:46-47",
      Text: "He said to them, “Thus it is written, and thus it was necessary for the Christ to suffer and to rise from the dead the third day, and that repentance and remission of sins should be preached in his name to all the nations, beginning at Jerusalem.",
    Audio: "Luke24v46-47-JG",
    NPCSays: ["People should not tell others to repent or turn to God and forsake their sins.", "The Jesus message is only for certain nations, other nations have their own beliefs which God respects."],
    Lie: "You can be saved from sin without turning from it."
  }, {
      Id: 1532,
      Name: "Good News",
      Reference: "Acts 2:38",
      Text: "Peter said to them, “Repent and be baptized, every one of you, in the name of Jesus Christ for the forgiveness of sins, and you will receive the gift of the Holy Spirit.”",
    Audio: "Acts2v38-JG",
    NPCSays: ["If I accept Jesus it doesn't really matter if I repent or get baptised", "The Holy Spirit is no longer promised in our day."],
    Lie: "The Holy Spirit is not for today."
  }, {
      Id: 1533,
      Name: "Good News",
      Reference: "Mark 16:16",
      Text: "He who believes and is baptized will be saved.",
    Audio: "Mark16v16-Hala",
    NPCSays: ["Baptism in water is not something God cares about."],
    Lie: "Baptism in water doesn't matter."
  }, {
      Id: 1534,
      Name: "Good News",
      Reference: "Mark 16:17",
      Text: "These signs will accompany those who believe: in my name they will cast out demons.",
    Audio: "Mark16v17-JF",
    Lie: "There are hardly any demons today and it is harmful to people to try to cast them out.",
    NPCSays: ["Ordinary believers can't expect to cast out demons. It is for special people in the church only.", "You can believe but it doesn't mean anything will happen."]
  },  {
      Id: 1535,
      Name: "Good News",
      Reference: "John 1:12",
      Text: "But as many as received him, to them he gave the right to become God’s children, to those who believe in his name: who were born, not of blood, nor of the will of the flesh, nor of the will of man, but of God.",
    Audio: "John1v12-Amber",
    NPCSays: ["Becoming a child of God is something you can decide to do any time.", "Everyone is God's child. It isn't necessary to receive Jesus for this."]
  }, 
  {
      Id: 1536,
      Name: "Good News",
      Reference: "Ephesians 2:8-9",
      Text: "for by grace you have been saved through faith, and that not of yourselves; it is the gift of God, not of works, that no one would boast.",
    Lie: "You have to work hard to be accepted by God",
    Audio: "Eph2v8-9-HF",
    NPCSays: ["I'm just working my way to heaven and hoping for the best.", "How much do you have to do before God will accept you?", "Your salvation is all up to you."]
  },
  {
      Id: 1537,
      Name: "Good News",
      Reference: "John 14:1-2",
      Text: "“Don’t let your heart be troubled. Believe in God. Believe also in me. In my Father’s house are many homes. If it weren’t so, I would have told you. I am going to prepare a place for you.",
    Audio: "John14v1-2-ST",
    Lie: "You will go to hell when you die.",
    NPCSays: ["Imagine there's no heaven. Above us only sky.", "There's nothing to look forward to after death."]
    
  }, 
  {
      Id: 1538,
      Name: "Good News",
      Reference: "2 Corinthians 4:3",
      Text: "Even if our Good News is veiled, it is veiled in those who are dying.",
    Audio: "2Cor4v3-HF",
    NPCSays: ["What are you saying about Jesus? I can't see any point in these things you talk about.", "There is no problem. I am not in danger."]
  }, 
  {
      Id: 1543,
      Name: "Identity",
      Reference: "Genesis 1:27",
      Text: "God created man in his own image. In God’s image he created him",
    Lie: "You are nothing but a freak of Nature. An accident.",
    NPCSays: ["We all evolved from apes. That's how we got here", "People aren't worth all that much."]
  },  
  {
      Id: 1575,
      Name: "Identity",
      Reference: "Ephesians 5:8",
      Text: "For you were once darkness, but are now light in the Lord. Walk as children of light.",
    Lie: "Everyone is a bit of a son of God and a bit of a son of the devil.",
    NPCSays: ["Everyone is a bit of a son of God and a bit of a son of the devil.", "It isn't really possible to live a holy life and God understands that."]
  },
  
   {
      Id: 1551,
      Name: "Identity",
      Reference: "Psalms 139:14",
      Text: "I will give thanks to you, for I am fearfully and wonderfully made. Your works are wonderful. My soul knows that very well.",
    Lie: "You are too ugly to be loved.",
    NPCSays: ["I'm nothing special."]
  },
   {
      Id: 1539,
      Name: "Identity",
      Reference: "Galatians 3:26",
      Text: "For you are all children of God, through faith in Christ Jesus.",
    Lie: "Having faith doesn't make you a child of God.",
    NPCSays: ["We are ALL children of God. You don't have to believe in Jesus or things like that.", "God doesn't have sons or children."]
    
  },
  
  {
      Id: 1547,
      Name: "Identity",
      Reference: "1 Corinthians 6:19-20",
      Text: "Or don’t you know that your body is a temple of the Holy Spirit who is in you, whom you have from God? You are not your own, for you were bought with a price. Therefore glorify God in your body and in your spirit, which are God’s.",
    Lie: "The Holy Spirit does not live in your body so you can do whatever feels good.",
    NPCSays: ["It's my life.", "It doesn't matter how I treat my body."]
  }, 
  {
      Id: 1541,
      Name: "Identity",
      Reference: "2 Corinthians 5:17",
      Text: "Therefore if anyone is in Christ, he is a new creation. The old things have passed away. Behold, all things have become new.",
    Lie: "You are still the same old person.",
    NPCSays: ["Even though I believe in Jesus, I am still a dirty rotten sinner."]
  }, 
  {
      Id: 1538,
      Name: "Identity",
      Reference: "John 1:12",
      Text: "But as many as received him, to them he gave the right to become God’s children, to those who believe in his name:"
  }, {
      Id: 1540,
      Name: "Identity",
      Reference: "Romans 8:16-17",
      Text: "The Spirit himself testifies with our spirit that we are children of God; and if children, then heirs— heirs of God and joint heirs with Christ, if indeed we suffer with him, that we may also be glorified with him."
  }, 
  {
      Id: 1548,
      Name: "Identity",
      Reference: "1 Corinthians 12:27",
      Text: "Now you are the body of Christ, and members individually."
  },
  
  {
      Id: 1542,
      Name: "Identity",
      Reference: "John 15:15",
      Text: "No longer do I call you servants, for the servant doesn’t know what his lord does. But I have called you friends, for everything that I heard from my Father, I have made known to you."
  }, {
      Id: 1544,
      Name: "Identity",
      Reference: "1 Peter 2:9",
      Text: "But you are a chosen race, a royal priesthood, a holy nation, a people for God’s own possession, that you may proclaim the excellence of him who called you out of darkness into his marvelous light."
  }, {
      Id: 1545,
      Name: "Identity",
      Reference: "Jeremiah 29:11",
      Text: "For I know the thoughts that I think toward you,” says Yahweh, “thoughts of peace, and not of evil, to give you hope and a future."
  }, {
      Id: 1546,
      Name: "Identity",
      Reference: "Ephesians 2:10",
      Text: "For we are his workmanship, created in Christ Jesus for good works, which God prepared before that we would walk in them."
  }, {
      Id: 1549,
      Name: "Identity",
      Reference: "1 John 3:1-3",
      Text: "See how great a love the Father has given to us, that we should be called children of God! For this cause the world doesn’t know us, because it didn’t know him. Beloved, now we are children of God. It is not yet revealed what we will be; but we know that when he is revealed, we will be like him, for we will see him just as he is. Everyone who has this hope set on him purifies himself, even as he is pure."
  }, {
      Id: 1550,
      Name: "Identity",
      Reference: "Colossians 3:1-4",
      Text: "If then you were raised together with Christ, seek the things that are above, where Christ is, seated on the right hand of God. Set your mind on the things that are above, not on the things that are on the earth. For you died, and your life is hidden with Christ in God. When Christ, our life, is revealed, then you will also be revealed with him in glory."
  }, {
      Id: 1552,
      Name: "Identity",
      Reference: "John 15:5",
      Text: "I am the vine. You are the branches. He who remains in me and I in him bears much fruit, for apart from me you can do nothing."
  }, {
      Id: 1553,
      Name: "Identity",
      Reference: "Isaiah 43:1",
      Text: "But now Yahweh who created you, Jacob, and he who formed you, Israel, says:“Don’t be afraid, for I have redeemed you. I have called you by your name. You are mine."
  }, {
      Id: 1554,
      Name: "Identity",
      Reference: "Romans 8:14-15",
      Text: "For as many as are led by the Spirit of God, these are children of God. For you didn’t receive the spirit of bondage again to fear, but you received the Spirit of adoption, by whom we cry, “Abba! Father!”"
  }, {
      Id: 1555,
      Name: "Identity",
      Reference: "Genesis 2:7",
      Text: "Yahweh God formed man from the dust of the ground, and breathed into his nostrils the breath of life; and man became a living soul."
  }, {
      Id: 1556,
      Name: "Identity",
      Reference: "Romans 8:1",
      Text: "There is therefore now no condemnation to those who are in Christ Jesus, who don’t walk according to the flesh, but according to the Spirit."
  }, {
      Id: 1557,
      Name: "Identity",
      Reference: "Colossians 3:3",
      Text: "For you died, and your life is hidden with Christ in God."
  }, {
      Id: 1558,
      Name: "Identity",
      Reference: "Ephesians 1:4",
      Text: "even as he chose us in him before the foundation of the world, that we would be holy and without defect before him in love,"
  }, {
      Id: 1559,
      Name: "Identity",
      Reference: "Colossians 3:12",
      Text: "Put on therefore, as God’s chosen ones, holy and beloved, a heart of compassion, kindness, lowliness, humility, and perseverance;"
  }, {
      Id: 1560,
      Name: "Identity",
      Reference: "Romans 6:6",
      Text: "knowing this, that our old man was crucified with him, that the body of sin might be done away with, so that we would no longer be in bondage to sin."
  }, {
      Id: 1561,
      Name: "Identity",
      Reference: "Romans 8:17",
      Text: "and if children, then heirs — heirs of God and joint heirs with Christ, if indeed we suffer with him, that we may also be glorified with him."
  }, {
      Id: 1562,
      Name: "Identity",
      Reference: "1 Samuel 16:7",
      Text: "But Yahweh said to Samuel, “Don’t look on his face, or on the height of his stature, because I have rejected him; for I don’t see as man sees. For man looks at the outward appearance, but Yahweh looks at the heart.”"
  }, {
      Id: 1563,
      Name: "Identity",
      Reference: "Philippians 3:20",
      Text: "For our citizenship is in heaven, from where we also wait for a Savior, the Lord Jesus Christ,"
  }, {
      Id: 1564,
      Name: "Identity",
      Reference: "John 15:16",
      Text: "You didn’t choose me, but I chose you and appointed you, that you should go and bear fruit, and that your fruit should remain; that whatever you will ask of the Father in my name, he may give it to you."
  }, {
      Id: 1565,
      Name: "Identity",
      Reference: "Psalms 100:3",
      Text: "Know that Yahweh, he is God. It is he who has made us, and we are his. We are his people, and the sheep of his pasture."
  }, {
      Id: 1566,
      Name: "Identity",
      Reference: "Colossians 1:27",
      Text: "to whom God was pleased to make known what are the riches of the glory of this mystery among the Gentiles, which is Christ in you, the hope of glory."
  }, {
      Id: 1567,
      Name: "Identity",
      Reference: "Ephesians 2:19",
      Text: "So then you are no longer strangers and foreigners, but you are fellow citizens with the saints and of the household of God,"
  }, {
      Id: 1568,
      Name: "Identity",
      Reference: "Romans 8:15",
      Text: "For you didn’t receive the spirit of bondage again to fear, but you received the Spirit of adoption, by whom we cry, “Abba! Father!”"
  }, {
      Id: 1569,
      Name: "Identity",
      Reference: "Isaiah 49:16",
      Text: "Behold, I have engraved you on the palms of my hands. Your walls are continually before me."
  }, {
      Id: 1570,
      Name: "Identity",
      Reference: "John 3:16",
      Text: "For God so loved the world, that he gave his only born Son, that whoever believes in him should not perish, but have eternal life."
  }, {
      Id: 1571,
      Name: "Identity",
      Reference: "Ephesians 1:7",
      Text: "In him we have our redemption through his blood, the forgiveness of our trespasses, according to the riches of his grace"
  }, {
      Id: 1572,
      Name: "Identity",
      Reference: "1 Corinthians 6:17",
      Text: "But he who is joined to the Lord is one spirit."
  }, {
      Id: 1573,
      Name: "Identity",
      Reference: "Colossians 2:10",
      Text: "and in him you are made full, who is the head of all principality and power."
  }, {
      Id: 1574,
      Name: "Identity",
      Reference: "Jeremiah 13:23",
      Text: "Can the Ethiopian change his skin, or the leopard his spots? Then may you also do good,who are accustomed to do evil."
  },  {
      Id: 1576,
      Name: "Identity",
      Reference: "Ephesians 1:5",
      Text: "having predestined us for adoption as children through Jesus Christ to himself, according to the good pleasure of his desire,"
  }, {
      Id: 1577,
      Name: "Identity",
      Reference: "Colossians 2:9-10",
      Text: "For in him all the fullness of the Deity dwells bodily, and in him you are made full, who is the head of all principality and power."
  }, {
      Id: 1578,
      Name: "Identity",
      Reference: "Romans 15:7",
      Text: "Therefore accept one another, even as Christ also accepted you, to the glory of God."
  }, {
      Id: 1579,
      Name: "Identity",
      Reference: "1 John 3:1-2",
      Text: "See how great a love the Father has given to us, that we should be called children of God! For this cause the world doesn’t know us, because it didn’t know him. Beloved, now we are children of God. It is not yet revealed what we will be; but we know that when he is revealed, we will be like him, for we will see him just as he is."
  }, {
      Id: 1580,
      Name: "Identity",
      Reference: "Ephesians 1:3",
      Text: "Blessed be the God and Father of our Lord Jesus Christ, who has blessed us with every spiritual blessing in the heavenly places in Christ,"
  }, {
      Id: 1581,
      Name: "Identity",
      Reference: "Galatians 3:28",
      Text: "There is neither Jew nor Greek, there is neither slave nor free man, there is neither male nor female; for you are all one in Christ Jesus."
  }, {
      Id: 1582,
      Name: "Identity",
      Reference: "Ephesians 3:12",
      Text: "In him we have boldness and access in confidence through our faith in him."
  }, {
      Id: 1583,
      Name: "Identity",
      Reference: "Ephesians 2:8",
      Text: "for by grace you have been saved through faith, and that not of yourselves; it is the gift of God,"
  }, {
      Id: 1584,
      Name: "Identity",
      Reference: "Colossians 1:2",
      Text: "to the saints and faithful brothers in Christ at Colossae: Grace to you and peace from God our Father and the Lord Jesus Christ."
  }, {
      Id: 1585,
      Name: "Identity",
      Reference: "Philippians 4:19",
      Text: "My God will supply every need of yours according to his riches in glory in Christ Jesus."
  }, {
      Id: 1586,
      Name: "Identity",
      Reference: "Galatians 3:27-28",
      Text: "For as many of you as were baptized into Christ have put on Christ. There is neither Jew nor Greek, there is neither slave nor free man, there is neither male nor female; for you are all one in Christ Jesus."
  }, {
      Id: 1587,
      Name: "Identity",
      Reference: "Romans 5:1",
      Text: "Being therefore justified by faith, we have peace with God through our Lord Jesus Christ;"
  }, {
      Id: 1588,
      Name: "Identity",
      Reference: "Ephesians 1:11",
      Text: "We were also assigned an inheritance in him, having been foreordained according to the purpose of him who does all things after the counsel of his will,"
  }, {
      Id: 1589,
      Name: "Identity",
      Reference: "Isaiah 64:8",
      Text: "But now, Yahweh, you are our Father. We are the clay and you our potter. We all are the work of your hand."
  }, {
      Id: 1590,
      Name: "Identity",
      Reference: "Ephesians 2:13",
      Text: "But now in Christ Jesus you who once were far off are made near in the blood of Christ."
  }, {
      Id: 1591,
      Name: "Identity",
      Reference: "1 Samuel 12:22",
      Text: "For Yahweh will not forsake his people for his great name’s sake, because it has pleased Yahweh to make you a people for himself."
  }, {
      Id: 1592,
      Name: "Identity",
      Reference: "Ephesians 1:13",
      Text: "In him you also, having heard the word of the truth, the Good News of your salvation— in whom, having also believed, you were sealed with the promised Holy Spirit,"
  }, {
      Id: 1593,
      Name: "Identity",
      Reference: "1 John 3:1",
      Text: "See how great a love the Father has given to us, that we should be called children of God! For this cause the world doesn’t know us, because it didn’t know him."
  }, {
      Id: 1594,
      Name: "Identity",
      Reference: "Ephesians 2:4-5",
      Text: "But God, being rich in mercy, for his great love with which he loved us, even when we were dead through our trespasses, made us alive together with Christ— by grace you have been saved—"
  }, {
      Id: 1595,
      Name: "Identity",
      Reference: "1 Corinthians 1:30",
      Text: "Because of him, you are in Christ Jesus, who was made to us wisdom from God, and righteousness and sanctification, and redemption,"
  }, {
      Id: 1596,
      Name: "Identity",
      Reference: "Revelation 2:17",
      Text: "He who has an ear, let him hear what the Spirit says to the assemblies. To him who overcomes, to him I will give of the hidden manna, and I will give him a white stone, and on the stone a new name written which no one knows but he who receives it."
  }, {
      Id: 1597,
      Name: "Identity",
      Reference: "1 Peter 3:15",
      Text: "But sanctify the Lord God in your hearts. Always be ready to give an answer to everyone who asks you a reason concerning the hope that is in you, with humility and fear,"
  }, {
      Id: 1598,
      Name: "Identity",
      Reference: "2 Corinthians 5:20",
      Text: "We are therefore ambassadors on behalf of Christ, as though God were entreating by us: we beg you on behalf of Christ, be reconciled to God."
  }, {
      Id: 1599,
      Name: "Identity",
      Reference: "Romans 5:17",
      Text: "For if by the trespass of the one, death reigned through the one; so much more will those who receive the abundance of grace and of the gift of righteousness reign in life through the one, Jesus Christ."
  }, {
      Id: 1600,
      Name: "Identity",
      Reference: "2 Corinthians 1:21-22",
      Text: "Now he who establishes us with you in Christ and anointed us is God, who also sealed us and gave us the down payment of the Spirit in our hearts."
  }, {
      Id: 1601,
      Name: "Identity",
      Reference: "Galatians 2:20",
      Text: "I have been crucified with Christ, and it is no longer I who live, but Christ lives in me. That life which I now live in the flesh, I live by faith in the Son of God, who loved me and gave himself up for me."
  }, {
      Id: 1602,
      Name: "Identity",
      Reference: "Matthew 6:26",
      Text: "See the birds of the sky, that they don’t sow, neither do they reap, nor gather into barns. Your heavenly Father feeds them. Aren’t you of much more value than they?"
  }, {
      Id: 1603,
      Name: "Identity",
      Reference: "Matthew 5:14",
      Text: "You are the light of the world. A city located on a hill can’t be hidden."
  }, {
      Id: 1604,
      Name: "Identity",
      Reference: "Romans 8:37",
      Text: "No, in all these things we are more than conquerors through him who loved us."
  }, {
      Id: 1605,
      Name: "Identity",
      Reference: "2 Timothy 1:7",
      Text: "For God didn’t give us a spirit of fear, but of power, love, and self-control."
  }, {
      Id: 1606,
      Name: "Identity",
      Reference: "Ephesians 1:5-8",
      Text: "having predestined us for adoption as children through Jesus Christ to himself, according to the good pleasure of his desire, to the praise of the glory of his grace, by which he freely gave us favor in the Beloved. In him we have our redemption through his blood, the forgiveness of our trespasses, according to the riches of his grace which he made to abound toward us in all wisdom and prudence,"
  }, {
      Id: 1607,
      Name: "Identity",
      Reference: "Psalms 95:6-7",
      Text: "Oh come, let’s worship and bow down.Let’s kneel before Yahweh, our Maker, for he is our God. We are the people of his pasture, and the sheep in his care. Today, oh that you would hear his voice!"
  }, {
      Id: 1608,
      Name: "Identity",
      Reference: "1 Corinthians 6:20",
      Text: "for you were bought with a price. Therefore glorify God in your body and in your spirit, which are God’s."
  }, {
      Id: 1609,
      Name: "Identity",
      Reference: "Romans 8:28",
      Text: "We know that all things work together for good for those who love God, for those who are called according to his purpose."
  },
  
      {
    Id: 1620,
    Name: "Deliverance",
    Reference: "Matthew 6:13",
    Text: "Bring us not into temptation, but deliver us from the evil one."
    },
    {
      Id: 1621,
      Name: "Deliverance",
      Reference: "James 4:7",
      Text: "Be subject therefore to God. Resist the devil, and he will flee from you."
    },
    {
      Id: 1622,
      Name: "Deliverance",
      Reference: "Mark 16:17",
      Text: "These signs will accompany those who believe: in my name they will cast out demons; they will speak with new languages;"
    },
    {
      Id: 1623,
      Name: "Deliverance",
      Reference: "2 Corinthians 7:1",
      Text: "Having therefore these promises, beloved, let’s cleanse ourselves from all defilement of flesh and spirit, perfecting holiness in the fear of God."
    },
    {
      Id: 1624,
      Name: "Deliverance",
      Reference: "Matthew 6:12",
      Text: "Forgive us our debts, as we also forgive our debtors."
    },
    {
      Id: 1625,
      Name: "Deliverance",
      Reference: "Ephesians 4:27",
      Text: "and don’t give place to the devil."
    },
    {
      Id: 1626,
      Name: "Deliverance",
      Reference: "1 John 1:9",
      Text: "If we confess our sins, he is faithful and righteous to forgive us the sins and to cleanse us from all unrighteousness."
    },
    {
      Id: 1627,
      Name: "Deliverance",
      Reference: "Mark 11:23",
      Text: "For most certainly I tell you, whoever may tell this mountain, ‘Be taken up and cast into the sea,’ and doesn’t doubt in his heart, but believes that what he says is happening, he shall have whatever he says."
    },
    {
      Id: 1628,
      Name: "Deliverance",
      Reference: "Matthew 10:8",
      Text: "Heal the sick, cleanse the lepers, and cast out demons. Freely you received, so freely give."
    },
    {
      Id: 1629,
      Name: "Deliverance",
      Reference: "John 20:21",
      Text: "Jesus therefore said to them again, “Peace be to you. As the Father has sent me, even so I send you.”"
    },
    {
      Id: 1630,
      Name: "Deliverance",
      Reference: "Matthew 28:20",
      Text: "teaching them to observe all things that I commanded you. Behold, I am with you always, even to the end of the age.” Amen."
    },
    {
      Id: 1631,
      Name: "Deliverance",
      Reference: "Revelation 12:11",
      Text: "They overcame him because of the Lamb’s blood, and because of the word of their testimony. They didn’t love their life, even to death."
    },
    {
      Id: 1632,
      Name: "Deliverance",
      Reference: "James 4:6",
      Text: "But he gives more grace. Therefore it says, “God resists the proud, but gives grace to the humble.”"
    },
    {
      Id: 1633,
      Name: "Deliverance",
      Reference: "Luke 10:19",
      Text: "Behold, I give you authority to tread on serpents and scorpions, and over all the power of the enemy. Nothing will in any way hurt you."
    },
    {
      Id: 1634,
      Name: "Deliverance",
      Reference: "Acts 16:18",
      Text: "She was doing this for many days. But Paul, becoming greatly annoyed, turned and said to the spirit, “I command you in the name of Jesus Christ to come out of her!” It came out that very hour."
    },
    {
      Id: 1635,
      Name: "Deliverance",
      Reference: "Matthew 4:24",
      Text: "The report about him went out into all Syria. They brought to him all who were sick, afflicted with various diseases and torments, demonized, epileptics, and paralytics; and he healed them."
    },
    {
      Id: 1636,
      Name: "Deliverance",
      Reference: "Acts 16:18",
      Text: "He who sins is of the devil, for the devil has been sinning from the beginning. To this end the Son of God was revealed: that he might destroy the works of the devil."
    },
    {
      Id: 1637,
      Name: "Deliverance",
      Reference: "Mark 1:25",
      Text: "Jesus rebuked him, saying, “Be quiet, and come out of him!”"
    },
    {
      Id: 1638,
      Name: "Deliverance",
      Reference: "Mark 1:39",
      Text: "He went into their synagogues throughout all Galilee, preaching and casting out demons."
    },
    {
      Id: 1639,
      Name: "Deliverance",
      Reference: "Proverbs 11:9",
      Text: "With his mouth the godless man destroys his neighbour, but the righteous will be delivered through knowledge."
    },
    {
      Id: 1640,
      Name: "Deliverance",
      Reference: "Matthew 18:34-35",
      Text: "His lord was angry, and delivered him to the tormentors until he should pay all that was due to him. So my heavenly Father will also do to you, if you don’t each forgive your brother from your hearts for his misdeeds.”"
    },
    { Id: 1641,
       Name: "ShareGospel",
       Reference: "1 John 5:19",
       Text: "We know that we are of God, and the whole world lies in the power of the evil one.",
       Lie: "God is behind everything bad that happens to you"
    },
      {   
          Name: "Power",
          Reference: "Acts 1:8",
          Text: "But you will receive power when the Holy Spirit has come upon you. You will be witnesses to me in Jerusalem, in all Judea and Samaria, and to the uttermost parts of the earth.",
          Lie: "Not everyone is supposed to be a witness with power."
      },
      {   
          Name: "Power",
          Reference: "1 Corinthians 4:20",
          Text: "For God’s Kingdom is not in word, but in power.",
          Lie: "Power is not important in God's Kingdom."
      },
      {   
          Name: "Power",
          Reference: "Luke 11:13",
          Text: "If you then, being evil, know how to give good gifts to your children, how much more will your heavenly Father give the Holy Spirit to those who ask him?",
          Lie: "Other people might receive the Holy Spirit, but not you. You just know He won't answer."
      },
      {   
          Name: "Power",
          Reference: "Acts 2:4",
          Text: "They were all filled with the Holy Spirit and began to speak with other languages, as the Spirit gave them the ability to speak.",
          Lie: "If God wants you to speak in tongues, He will move your tongue."
      },
      {   
          Name: "Power",
          Reference: "Mark 16:17",
          Text: "These signs will accompany those who believe: in my name they will cast out demons; they will speak with new languages;",
          Lie: "Casting out demons and speaking in tongues are special gifts for very few people."
      },
      {   
          Name: "Power",
          Reference: "Acts 2:38-39",
          Text: "Peter said to them, “Repent and be baptised, every one of you, in the name of Jesus Christ for the forgiveness of sins, and you will receive the gift of the Holy Spirit. For the promise is to you and to your children, and to all who are far off, even as many as the Lord our God will call to himself.”",
          Lie: "The Holy Spirit promise was only for the first disciples, not us."
      },
      {   
          Name: "Power",
          Reference: "John 14:12",
          Text: "Most certainly I tell you, he who believes in me, the works that I do, he will do also; and he will do greater works than these, because I am going to my Father.",
          Lie: "Jesus did what he did because he was the Son of God. We aren't going to do what He did."
      },
      {   
          Name: "Power",
          Reference: "John 7:37-39",
          Text: "Now on the last and greatest day of the feast, Jesus stood and cried out, “If anyone is thirsty, let him come to me and drink! He who believes in me, as the Scripture has said, from within him will flow rivers of living water.” But he said this about the Spirit, which those believing in him were to receive. For the Holy Spirit was not yet given, because Jesus wasn’t yet glorified.",
          Lie: "The Spirit will not make much difference in your life."
      },
      {   
          Name: "Power",
          Reference: "Matthew 6:17-18",
          Text: "But you, when you fast, anoint your head and wash your face, so that you are not seen by men to be fasting, but by your Father who is in secret; and your Father, who sees in secret, will reward you.",
          Lie: "Fasting is a waste of time and only makes you weak."
      },
      {   
          Name: "Power",
          Reference: "Mark 11:23",
          Text: "For most certainly I tell you, whoever may tell this mountain, ‘Be taken up and cast into the sea,’ and doesn’t doubt in his heart, but believes that what he says is happening, he shall have whatever he says.",
          Lie: "Do not command things to happen, you have to pray if it is God's will instead."
      },
      {   
          Name: "Power",
          Reference: "Acts 1:4-5",
          Text: "Being assembled together with them, he commanded them, “Don’t depart from Jerusalem, but wait for the promise of the Father, which you heard from me. 5For John indeed baptised in water, but you will be baptised in the Holy Spirit not many days from now.”",
          Lie: "Just go. Waiting on God for power is not required."
      },
      {   
          Name: "Power",
          Reference: "Luke 24:49",
          Text: "Behold, I send out the promise of my Father on you. But wait in the city of Jerusalem until you are clothed with power from on high.",
          Lie: "Just get busy for God, with or without power."
      },
      {   
          Name: "Power",
          Reference: "John 15:7",
          Text: "If you remain in me, and my words remain in you, you will ask whatever you desire, and it will be done for you.",
          Lie: "There is no way to be sure God will answer your prayers."
      },
      {   
          Name: "Power",
          Reference: "Ephesians 5:18",
          Text: "Don’t be drunken with wine, in which is dissipation, but be filled with the Spirit",
          Lie: "Being filled with the Spirit is optional."
      },
      {   
          Name: "Power",
          Reference: "Luke 4:13-14",
          Text: "When the devil had completed every temptation, he departed from him until another time. Jesus returned in the power of the Spirit into Galilee, and news about him spread through all the surrounding area.",
          Lie: "You can have power without passing tests."
      },
      {   
          Name: "Power",
          Reference: "Ephesians 6:18",
          Text: "with all prayer and requests, praying at all times in the Spirit, and being watchful to this end in all perseverance and requests for all the saints.",
          Lie: "Do not overdo this praying thing. Just keep it short and simple always."
      },
      {   
          Name: "Power",
          Reference: "2 Thessalonians 1:11-12",
          Text: "To this end we also pray always for you that our God may count you worthy of your calling, and fulfil every desire of goodness and work of faith with power, that the name of our Lord Jesus may be glorified in you, and you in him, according to the grace of our God and the Lord Jesus Christ.",
          Lie: "Prayer and choice have nothing to do with works of power. It is all up to God."
      },
      {   
          Name: "Power",
          Reference: "Acts 5:32",
          Text: "We are his witnesses of these things; and so also is the Holy Spirit, whom God has given to those who obey him.",
          Lie: "Obedience is optional for those seeking to walk with the Holy Spirit."
      },
      {   
          Name: "Power",
          Reference: "1 Corinthians 14:2",
          Text: "For he who speaks in another language speaks not to men, but to God, for no one understands, but in the Spirit he speaks mysteries.",
          Lie: "All speaking in tongues must be intepreted so people can understand."
      },
      {   
          Name: "Power",
          Reference: "1 Corinthians 12:8-10",
          Text: "For to one is given through the Spirit the word of wisdom, and to another the word of knowledge according to the same Spirit, to another faith by the same Spirit, and to another gifts of healings by the same Spirit, and to another workings of miracles, and to another prophecy, and to another discerning of spirits, to another different kinds of languages, and to another the interpretation of languages.",
          Lie: "The spiritual gifts are not for today, or maybe they are naturally developed abilities and skills."
      }
  
  ];
    return verses;
  
  }
  
function organizeByCategory(verses) {
        const categorizedVerses = {};
      
        verses.forEach((verse) => {
          const category = verse.Name;
          if (!categorizedVerses[category]) {
            categorizedVerses[category] = [];
          }
          categorizedVerses[category].push(verse);
        });
      
        return categorizedVerses;
}
  
  
  