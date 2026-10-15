require('dotenv').config({ path: require('path').join(__dirname, '..', '.env') });
const { pool } = require('../config/database');

async function seed() {
  console.log('Seeding initial admin data to MySQL...');

  // 1. Fetch Categories & Nominees to link
  const [cats] = await pool.query('SELECT id, name, slug FROM categories ORDER BY id ASC LIMIT 20');
  const [noms] = await pool.query('SELECT id, full_name, category_id FROM nominees ORDER BY id ASC');

  if (cats.length === 0 || noms.length === 0) {
    console.error('Missing categories or nominees to link data to!');
    process.exit(1);
  }

  console.log(`Found ${cats.length} categories, ${noms.length} nominees.`);

  // 2. Seed Nominations (Pending, Verified, Shortlisted)
  const [nomCount] = await pool.query('SELECT CAST(COUNT(*) AS SIGNED) AS count FROM nominations');
  if (nomCount[0].count === 0) {
    console.log('Seeding realistic nominations...');
    const nominationsData = [
      {
        cat: cats[0].id,
        code: 'NOM-2026-0041',
        full_name: 'Sravan Kumar',
        creator_name: 'Telugu Tech Guruji',
        email: 'sravan.tech@gmail.com',
        phone: '9848022338',
        city: 'Hyderabad',
        state: 'Telangana',
        platform: 'YouTube',
        yt: 'https://youtube.com/@telugutechguruji',
        insta: 'https://instagram.com/telugutechguruji',
        photo: 'https://images.unsplash.com/photo-1534528741775-53994a69daeb?auto=format&fit=crop&w=400&q=80',
        journey: 'Started tech reviews in Telugu in 2020. Built 850k community explaining artificial intelligence, smartphones, and affordable gadgets in simple Telugu.',
        achievements: 'Gold Creator Award, 150M total views, top reviewer in South India.',
        status: 'pending',
        notes: 'Pending initial jury screening.'
      },
      {
        cat: cats[1]?.id || cats[0].id,
        code: 'NOM-2026-0042',
        full_name: 'Harika Varma',
        creator_name: 'Dosa To Dinners',
        email: 'harika.food@gmail.com',
        phone: '9849112233',
        city: 'Vijayawada',
        state: 'Andhra Pradesh',
        platform: 'Instagram',
        yt: 'https://youtube.com/@dosatodinners',
        insta: 'https://instagram.com/dosatodinners',
        photo: 'https://images.unsplash.com/photo-1544005313-94ddf0286df2?auto=format&fit=crop&w=400&q=80',
        journey: 'Preserving authentic grandmother recipes from Godavari and Krishna districts. 1.2M Instagram foodies follow daily step-by-step reels.',
        achievements: 'Featured in The Hindu, 40M reel plays, authored Telugu cookbook.',
        status: 'verified',
        notes: 'Profile and identity verified by research desk.'
      },
      {
        cat: cats[2]?.id || cats[0].id,
        code: 'NOM-2026-0043',
        full_name: 'Rajesh & Team',
        creator_name: 'Hyderabadi Chai Charcha',
        email: 'rajesh.chai@gmail.com',
        phone: '9700344556',
        city: 'Hyderabad',
        state: 'Telangana',
        platform: 'YouTube',
        yt: 'https://youtube.com/@chaicharchatelugu',
        insta: 'https://instagram.com/chaicharchatelugu',
        photo: 'https://images.unsplash.com/photo-1507003211169-0a1dd7228f2d?auto=format&fit=crop&w=400&q=80',
        journey: 'Hilarious satirical sketches on IT life in Hitec City, Telugu cinema reactions, and everyday Hyderabadi lifestyle.',
        achievements: 'Over 2M subscribers, 500M+ lifetime views, popular youth icon.',
        status: 'shortlisted',
        notes: 'Shortlisted for People Choice voting.'
      },
      {
        cat: cats[3]?.id || cats[0].id,
        code: 'NOM-2026-0044',
        full_name: 'Ananya Rao',
        creator_name: 'Telugu Cinema Insights',
        email: 'ananya.films@gmail.com',
        phone: '9988776655',
        city: 'Visakhapatnam',
        state: 'Andhra Pradesh',
        platform: 'YouTube',
        yt: 'https://youtube.com/@telugucinemainsights',
        insta: 'https://instagram.com/telugucinemainsights',
        photo: 'https://images.unsplash.com/photo-1517841905240-472988babdf9?auto=format&fit=crop&w=400&q=80',
        journey: 'In-depth video essays dissecting classic and modern Tollywood filmmaking, sound design, and screenwriting nuances.',
        achievements: 'Recognized by top Tollywood directors, 600K subscribers.',
        status: 'pending',
        notes: 'Awaiting phone callback verification.'
      },
      {
        cat: cats[4]?.id || cats[0].id,
        code: 'NOM-2026-0045',
        full_name: 'Kiran Goud',
        creator_name: 'Farmer Kiran Telugu',
        email: 'kiran.krishi@gmail.com',
        phone: '9440123456',
        city: 'Warangal',
        state: 'Telangana',
        platform: 'YouTube',
        yt: 'https://youtube.com/@farmerkirantelugu',
        insta: 'https://instagram.com/farmerkirantelugu',
        photo: 'https://images.unsplash.com/photo-1500648767791-00dcc994a43e?auto=format&fit=crop&w=400&q=80',
        journey: 'Educating 400,000+ farmers across Telugu states on modern organic farming, drone spraying, drip irrigation, and market prices.',
        achievements: 'State Agritech Youth Innovator Award 2025, 50M views on organic guides.',
        status: 'verified',
        notes: 'Verified farmer impact creator.'
      }
    ];

    for (const n of nominationsData) {
      await pool.query(`
        INSERT INTO nominations (
          category_id, nomination_code, full_name, creator_name, email, phone, city, state,
          primary_platform, youtube_url, instagram_url, photo_url, journey, achievements, status, admin_notes
        ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
      `, [
        n.cat, n.code, n.full_name, n.creator_name, n.email, n.phone, n.city, n.state,
        n.platform, n.yt, n.insta, n.photo, n.journey, n.achievements, n.status, n.notes
      ]);
    }
    console.log(`✓ Seeded ${nominationsData.length} nominations.`);
  }

  // 3. Seed Realistic Votes & Audit Stream
  const [voteCount] = await pool.query('SELECT CAST(COUNT(*) AS SIGNED) AS count FROM votes');
  if (voteCount[0].count === 0) {
    console.log('Seeding realistic votes & audit log stream...');
    const sampleVoters = [
      { name: 'Karthik Reddy', email: 'karthik.r@gmail.com', phone: '9849011223', ip: '49.205.120.45', otp: 1, flagged: 0, reason: null },
      { name: 'Swathi Ch', email: 'swathi.ch@yahoo.com', phone: '9440155667', ip: '157.48.210.12', otp: 1, flagged: 0, reason: null },
      { name: 'Ravi Teja V', email: 'raviteja.v@gmail.com', phone: '9988044332', ip: '49.205.120.45', otp: 1, flagged: 0, reason: null },
      { name: 'Bhavani K', email: 'bhavani.k@outlook.com', phone: '9701122334', ip: '115.112.80.99', otp: 1, flagged: 0, reason: null },
      { name: 'Manoj Kumar', email: 'manoj.k@gmail.com', phone: '9347890123', ip: '182.73.14.88', otp: 1, flagged: 1, reason: 'High velocity voting attempt from same IP subnet' },
      { name: 'Anusha P', email: 'anusha.p@gmail.com', phone: '9121334455', ip: '103.24.120.5', otp: 1, flagged: 0, reason: null },
      { name: 'Suresh Babu', email: 'suresh.b@gmail.com', phone: '9550066778', ip: '103.24.120.5', otp: 1, flagged: 0, reason: null },
      { name: 'Deepika Rao', email: 'deepika.rao@gmail.com', phone: '9676112244', ip: '49.206.18.91', otp: 1, flagged: 0, reason: null },
      { name: 'Prashanth M', email: 'prashanth.m@gmail.com', phone: '9848554433', ip: '182.73.14.88', otp: 1, flagged: 1, reason: 'Fingerprint match with existing flagged bot session' },
      { name: 'Divya Sri', email: 'divyasri@gmail.com', phone: '9949887766', ip: '157.48.90.114', otp: 1, flagged: 0, reason: null },
    ];

    for (let i = 0; i < sampleVoters.length; i++) {
      const v = sampleVoters[i];
      const nominee = noms[i % noms.length];
      await pool.query(`
        INSERT INTO votes (
          nominee_id, category_id, voter_name, voter_email, voter_phone,
          ip_address, user_agent, otp_verified, is_flagged, flag_reason, created_at
        ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, DATE_SUB(NOW(), INTERVAL ? HOUR))
      `, [
        nominee.id,
        nominee.category_id,
        v.name,
        v.email,
        v.phone,
        v.ip,
        'Mozilla/5.0 (iPhone; CPU iPhone OS 17_0 like Mac OS X)',
        v.otp,
        v.flagged,
        v.reason,
        i * 3
      ]);

      // Increment nominee vote count
      if (!v.flagged) {
        await pool.query('UPDATE nominees SET vote_count = vote_count + 1 WHERE id = ?', [nominee.id]);
      }
    }
    console.log(`✓ Seeded ${sampleVoters.length} verified/flagged votes.`);
  }

  // 4. Seed Past Events & Awardees
  const [eventCount] = await pool.query('SELECT CAST(COUNT(*) AS SIGNED) AS count FROM past_events');
  if (eventCount[0].count === 0) {
    console.log('Seeding past events & awardees...');
    const [res1] = await pool.query(`
      INSERT INTO past_events (slug, name, year, venue, description, poster_url, is_published, sort_order)
      VALUES (?, ?, ?, ?, ?, ?, 1, 1)
    `, [
      'telugu-icon-awards-2025',
      'Telugu Icon Awards 2025 Gala',
      2025,
      'Hitex Exhibition Center, Hyderabad',
      'The inaugural celebration of Telugu digital visionaries, influencers, and creative trailblazers with 3,000+ live attendees.',
      'https://images.unsplash.com/photo-1511578314322-379afb476865?auto=format&fit=crop&w=1200&q=80'
    ]);

    const ev1Id = res1.insertId;
    await pool.query(`
      INSERT INTO awardees (past_event_id, name, category, award_type, year, bio, social_handle)
      VALUES 
      (?, 'Prasad Tech in Telugu', 'Best Tech Creator of the Year', 'Winner', 2025, 'Pioneering Telugu gadget reviews and consumer tech education.', '@prasadtechintelugu'),
      (?, 'Uma Telugu Traveller', 'Excellence in Travel & Heritage Storytelling', 'Winner', 2025, 'Capturing global travel experiences in native Telugu.', '@umatravels'),
      (?, 'Dr. Sudha Rani', 'Excellence in Healthcare Digital Education', 'Special Jury Award', 2025, 'Spreading verified medical awareness across rural Andhra & Telangana.', '@drsudharani')
    `, [ev1Id, ev1Id, ev1Id]);

    console.log('✓ Seeded past events & awardees.');
  }

  // 5. Seed Gallery Items & Media Press Releases
  const [galCount] = await pool.query('SELECT CAST(COUNT(*) AS SIGNED) AS count FROM gallery_items');
  if (galCount[0].count === 0) {
    console.log('Seeding gallery photos...');
    await pool.query(`
      INSERT INTO gallery_items (category, item_type, url, title, description, is_published)
      VALUES 
      ('telugu_icon_2026', 'image', 'https://images.unsplash.com/photo-1511578314322-379afb476865?auto=format&fit=crop&w=1000&q=80', 'Hitex Grand Arena Stage', 'State of the art stage with 4K LED mapping for August 30, 2026 Gala', 1),
      ('telugu_icon_2026', 'image', 'https://images.unsplash.com/photo-1492684223066-81342ee5ff30?auto=format&fit=crop&w=1000&q=80', 'Cinematic Atmosphere & Lighting', 'World-class red carpet and award presentation aesthetics', 1),
      ('press_events', 'image', 'https://images.unsplash.com/photo-1551836022-d5d88e9218df?auto=format&fit=crop&w=1000&q=80', 'Official Press Meet 2026', 'Jury panel and advisory committee briefing national media', 1)
    `);
    console.log('✓ Seeded gallery photos.');
  }

  const [medCount] = await pool.query('SELECT CAST(COUNT(*) AS SIGNED) AS count FROM media_items');
  if (medCount[0].count === 0) {
    console.log('Seeding media releases...');
    await pool.query(`
      INSERT INTO media_items (item_type, title, description, url, source, published_date, is_published)
      VALUES 
      ('press_release', 'Nominations Open for Telugu Icon Digital & Influencer Awards 2026', 'Official announcement of 60 award categories recognizing Telugu digital talent worldwide.', 'https://teluguiconawards.in/press', 'TIA Media Bureau', '2026-03-01', 1),
      ('news', 'Hitex Hyderabad to Host South India Largest Digital Gala on August 30', 'Over 3,500 creators, media personalities, and brand CMOs expected to attend.', 'https://teluguiconawards.in/press', 'Eenadu Digital', '2026-03-15', 1)
    `);
    console.log('✓ Seeded media releases.');
  }

  // 6. Seed Forensic Audit Logs
  const [auditCount] = await pool.query('SELECT CAST(COUNT(*) AS SIGNED) AS count FROM audit_logs');
  if (auditCount[0].count === 0) {
    console.log('Seeding audit logs...');
    await pool.query(`
      INSERT INTO audit_logs (admin_id, admin_email, action, entity_type, entity_id, details, ip_address, created_at)
      VALUES 
      (1, 'admin@teluguiconawards.com', 'PHASE_CHANGE', 'Settings', 1, 'Switched active event lifecycle phase to Phase 2 (Public Voting Live)', '103.24.120.5', DATE_SUB(NOW(), INTERVAL 2 DAY)),
      (1, 'admin@teluguiconawards.com', 'VOTE_FLAGGED', 'Vote', 5, 'Anti-fraud flagged suspicious vote attempt: High velocity subnet', '103.24.120.5', DATE_SUB(NOW(), INTERVAL 5 HOUR)),
      (1, 'admin@teluguiconawards.com', 'NOMINEE_VERIFIED', 'Nominee', 3, 'Nominee profile and direct voting campaign kit approved', '103.24.120.5', DATE_SUB(NOW(), INTERVAL 1 DAY))
    `);
    console.log('✓ Seeded audit logs.');
  }

  console.log('\n==============================================');
  console.log('✓ ALL ADMIN DATA SEEDED SUCCESSFULLY TO MYSQL!');
  console.log('==============================================');
  process.exit(0);
}

seed().catch(err => {
  console.error('Seed failed:', err);
  process.exit(1);
});
