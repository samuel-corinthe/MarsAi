SET NAMES utf8mb4;
SET FOREIGN_KEY_CHECKS = 0;

DROP TABLE IF EXISTS chatbot_faq_entries;

CREATE TABLE chatbot_faq_entries (
  id INT(11) NOT NULL AUTO_INCREMENT,
  faq_key VARCHAR(64) NOT NULL,
  language VARCHAR(8) NOT NULL DEFAULT 'fr',
  question VARCHAR(500) NOT NULL,
  answer TEXT NOT NULL,
  keywords TEXT DEFAULT NULL,
  is_active TINYINT(1) NOT NULL DEFAULT 1,
  usage_count INT(11) NOT NULL DEFAULT 0,
  created_at TIMESTAMP NULL DEFAULT CURRENT_TIMESTAMP,
  updated_at DATETIME NULL DEFAULT NULL,
  PRIMARY KEY (id),
  UNIQUE KEY uq_chatbot_faq_key_lang (faq_key, language),
  KEY idx_chatbot_faq_lang_active (language, is_active),
  KEY idx_chatbot_faq_key_active (faq_key, is_active),
  KEY idx_chatbot_faq_usage (usage_count)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

INSERT INTO chatbot_faq_entries (faq_key, language, question, answer, keywords, is_active)
VALUES
  ('sessions_hours', 'fr', 'Quels sont les horaires des sessions ?', 'Le festival accueille les invites de 10h a 22h, suivis de soirees de networking privees.', 'faq_sessions_hours horaires session heure programme ouverture fermeture schedule hours', 1),
  ('sessions_hours', 'en', 'What are the session hours?', 'The festival welcomes guests from 10:00 to 22:00, followed by private networking evenings.', 'faq_sessions_hours schedule session hours timetable opening closing horaires', 1),
  ('sessions_hours', 'ar', 'ما هي مواعيد الجلسات؟', 'يستقبل المهرجان الضيوف من 10:00 إلى 22:00، تليها أمسيات تواصل خاصة.', 'faq_sessions_hours مواعيد جلسات برنامج schedule hours horaires', 1),

  ('venue_location', 'fr', 'Ou se deroule l''evenement ?', 'L''evenement se tient dans un lieu prive sur le Vieux-Port de Marseille. L''adresse exacte figure sur votre invitation.', 'faq_venue_location lieu adresse marseille vieux port evenement location address', 1),
  ('venue_location', 'en', 'Where does the event take place?', 'The event takes place at a private venue on Marseille Old Port. The exact address is on your invitation.', 'faq_venue_location location address marseille old port venue lieu evenement', 1),
  ('venue_location', 'ar', 'اين يقام الحدث؟', 'يقام الحدث في مكان خاص على الميناء القديم في مرسيليا. العنوان الدقيق موجود في دعوتك.', 'faq_venue_location مكان عنوان مرسيليا ميناء location address lieu', 1),

  ('invitation_access', 'fr', 'Comment obtenir une invitation ?', 'Le festival est strictement sur invitation. Vous pouvez soumettre une demande d''accreditation via notre formulaire de contact professionnel.', 'faq_invitation_access invitation accreditation inscription acces invite', 1),
  ('invitation_access', 'en', 'How can I get an invitation?', 'The festival is strictly invitation-only. You can submit an accreditation request through our professional contact form.', 'faq_invitation_access invitation accreditation registration access', 1),
  ('invitation_access', 'ar', 'كيف احصل على دعوة؟', 'المهرجان متاح بالدعوة فقط. يمكنك تقديم طلب اعتماد عبر نموذج التواصل المهني.', 'faq_invitation_access دعوة اعتماد تسجيل invitation accreditation access', 1),

  ('target_audience', 'fr', 'Quel est le public vise ?', 'Cet evenement est exclusivement reserve aux adultes, professionnels de l''industrie, createurs et investisseurs.', 'faq_target_audience public cible adulte professionnel industrie createurs', 1),
  ('target_audience', 'en', 'Who is the target audience?', 'This event is exclusively for adults, industry professionals, creators, and investors.', 'faq_target_audience audience target adults professionals creators investors', 1),
  ('target_audience', 'ar', 'من هو الجمهور المستهدف؟', 'هذا الحدث مخصص للبالغين فقط، وللمهنيين في القطاع، والمبدعين، والمستثمرين.', 'faq_target_audience جمهور مستهدف بالغ مهني audience target adult', 1),

  ('children_policy', 'fr', 'Les enfants sont-ils admis ?', 'Non, le festival est un evenement strictement reserve aux adultes (18+) en raison du caractere professionnel des sessions.', 'faq_children_policy enfant mineur 18+ admission', 1),
  ('children_policy', 'en', 'Are children allowed?', 'No. The festival is strictly for adults (18+) due to the professional nature of the sessions.', 'faq_children_policy children minors 18+ admission', 1),
  ('children_policy', 'ar', 'هل يسمح بحضور الاطفال؟', 'لا، المهرجان مخصص للبالغين فقط (18+) بسبب الطبيعة المهنية للجلسات.', 'faq_children_policy اطفال قاصر 18+ قبول children minors', 1),

  ('id_requirement', 'fr', 'Faut-il presenter une piece d''identite ?', 'Oui, une piece d''identite correspondant au nom sur l''invitation sera exigee a l''entree.', 'faq_id_requirement identite carte passeport entree verification id', 1),
  ('id_requirement', 'en', 'Do I need to present an ID?', 'Yes. An ID matching the name on the invitation is required at entry.', 'faq_id_requirement id identity passport entry verification', 1),
  ('id_requirement', 'ar', 'هل يجب ابراز بطاقة هوية؟', 'نعم، يجب ابراز بطاقة هوية تطابق الاسم الموجود على الدعوة عند الدخول.', 'faq_id_requirement هوية بطاقة جواز دخول تحقق id identity', 1),

  ('accessibility_pmr', 'fr', 'L''accessibilite PMR est-elle assuree ?', 'Oui, tous nos espaces de conferences et de projection sont accessibles aux personnes a mobilite reduite.', 'faq_accessibility_pmr pmr accessibilite handicap mobilite reduite accessibility', 1),
  ('accessibility_pmr', 'en', 'Is accessibility for people with reduced mobility provided?', 'Yes. All conference and screening spaces are fully accessible to people with reduced mobility.', 'faq_accessibility_pmr accessibility reduced mobility disability pmr', 1),
  ('accessibility_pmr', 'ar', 'هل تتوفر سهولة الوصول لذوي الاعاقة الحركية؟', 'نعم، جميع قاعات المؤتمرات والعروض مجهزة بالكامل لذوي الاعاقة الحركية.', 'faq_accessibility_pmr وصول اعاقة حركية accessibility pmr handicap', 1),

  ('dress_code', 'fr', 'Quel est le dress code ?', 'Une tenue correcte ou business casual est exigee. Pour la soiree de cloture, une tenue de soiree est recommandee.', 'faq_dress_code dress code tenue vetement business casual', 1),
  ('dress_code', 'en', 'What is the dress code?', 'A proper or business-casual outfit is required. For the closing evening, cocktail attire is recommended.', 'faq_dress_code dress code outfit business casual cocktail', 1),
  ('dress_code', 'ar', 'ما هو الزي المطلوب؟', 'يلزم لباس لائق او عملي انيق. وفي سهرة الختام ينصح بلباس سهرة.', 'faq_dress_code زي لباس مظهر dress code tenue', 1),

  ('ai_film_submission', 'fr', 'Puis-je soumettre un film genere par IA ?', 'Oui. Les soumissions pour la selection officielle se font via l''espace createur sur notre site.', 'faq_ai_film_submission soumettre film ia upload candidature', 1),
  ('ai_film_submission', 'en', 'Can I submit an AI-generated film?', 'Yes. Submissions for the official selection are made through the creator area on our website.', 'faq_ai_film_submission submit ai film upload application', 1),
  ('ai_film_submission', 'ar', 'هل يمكنني ارسال فيلم مولد بالذكاء الاصطناعي؟', 'نعم. يتم ارسال الافلام للاختيار الرسمي عبر مساحة المبدع على موقعنا.', 'faq_ai_film_submission ارسال فيلم ذكاء اصطناعي submit ai film', 1),

  ('partner_sponsor', 'fr', 'Comment devenir partenaire ou sponsor ?', 'Pour toute demande de partenariat strategique, contactez la direction via le formulaire de contact du site.', 'faq_partner_sponsor partenaire sponsor partenariat entreprise', 1),
  ('partner_sponsor', 'en', 'How can I become a partner or sponsor?', 'For any strategic partnership request, please contact management via the contact form on our website.', 'faq_partner_sponsor partner sponsor partnership company', 1),
  ('partner_sponsor', 'ar', 'كيف اصبح شريكا او راعيا؟', 'لاي طلب شراكة استراتيجية، يرجى التواصل مع الادارة عبر نموذج التواصل على الموقع.', 'faq_partner_sponsor شريك راعي شراكة sponsor partner', 1),

  ('technical_workshops', 'fr', 'Y a-t-il des ateliers techniques ?', 'Oui, des masterclasses sur l''IA generative et le futur du cinema sont proposees selon le type de pass.', 'faq_technical_workshops atelier workshop masterclass technique pass vip', 1),
  ('technical_workshops', 'en', 'Are there technical workshops?', 'Yes. Advanced masterclasses on generative AI and the future of cinema are available depending on your pass type.', 'faq_technical_workshops workshops technical masterclass ai vip pass', 1),
  ('technical_workshops', 'ar', 'هل توجد ورشات تقنية؟', 'نعم، توجد دورات متقدمة حول الذكاء الاصطناعي التوليدي ومستقبل السينما حسب نوع البطاقة.', 'faq_technical_workshops ورشات تقنية ماستر كلاس vip workshop', 1),

  ('guest_policy', 'fr', 'Puis-je venir accompagne ?', 'Les invitations sont strictement personnelles. Toute demande d''accompagnateur doit etre validee en amont.', 'faq_guest_policy accompagne accompagnateur invitation invite', 1),
  ('guest_policy', 'en', 'Can I come with a guest?', 'Invitations are strictly personal. Any guest request must be approved in advance.', 'faq_guest_policy guest companion invitation approval', 1),
  ('guest_policy', 'ar', 'هل يمكنني الحضور مع مرافق؟', 'الدعوات شخصية جدا. اي طلب لمرافق يجب اعتماده مسبقا.', 'faq_guest_policy مرافق ضيف دعوة companion guest invitation', 1);

SET FOREIGN_KEY_CHECKS = 1;
