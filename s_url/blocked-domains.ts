// Lista zablokowanych domen i słów kluczowych
// Ten plik można łatwo edytować bez ingerencji w główny kod serwera

const blockedDomainRules: { blockedDomains: string[]; blockedKeywords: string[]; allowedExceptions: string[] } = {
    // Lista konkretnych zablokowanych domen
    blockedDomains: [
        // ===== STRONY PORNOGRAFICZNE (TOP SITES) =====
        'pornhub.com', 'xvideos.com', 'xnxx.com', 'xhamster.com', 'redtube.com',
        'youporn.com', 'tube8.com', 'spankbang.com', 'porn.com', 'pornhd.com',
        'beeg.com', 'sex.com', 'tnaflix.com', 'thumbzilla.com', 'eporner.com',
        'motherless.com', 'drtuber.com', 'porntrex.com', 'hdzog.com', 'txxx.com',
        'xfantasy.tv', 'upornia.com', 'sunporno.com', 'fantasti.cc', 'hqporner.com',
        'youjizz.com', 'brazzers.com', 'nuvid.com', 'ixxx.com', 'pornhub.net',
        'porndig.com', 'faphouse.com', 'xmegadrive.com', 'analdin.com', 'hotmovs.com',
        'xxxbunker.com', 'youav.com', 'vjav.com', 'porngo.com', 'xbabe.com',
        'privatehomeclips.com', 'pornicom.com', 'xpee.com', 'alphaporno.com',
        'porndoe.com', 'pornoxo.com', 'pornone.com', 'wetpussy.com', 'alotporn.com',
        'befuck.com', 'jizzbunker.com', 'filmyporno.tv', 'sexu.com', 'xozilla.com',
        'xlovecam.com', 'yourporn.sexy', 'pornhost.com', 'porn300.com', 'playvids.com',
        'pornktube.com', 'freeones.com', 'tube.porn', 'porn.com', 'anyporn.com',
        'fuq.com', 'pornpics.com', 'yespornplease.com', 'xmoviesforyou.com',
        'rule34.xxx', 'rule34video.com', 'hentai-foundry.com', 'nhentai.net',
        'hentaihaven.org', 'hanime.tv', 'tsumino.com', 'e-hentai.org', 'gelbooru.com',
        'danbooru.donmai.us', 'sankakucomplex.com', 'fakku.net', 'hitomi.la',
        'javlibrary.com', 'javmost.com', 'jav.guru', 'javhd.com', 'javdoe.com',
        'av01.tv', 'caribbeancom.com', 'tokyo-hot.com', 'heyzo.com',
        
        // ===== STRONY CAM/LIVE ADULT =====
        'chaturbate.com', 'myfreecams.com', 'cam4.com', 'bongacams.com', 
        'stripchat.com', 'camsoda.com', 'livejasmin.com', 'streamate.com',
        'cams.com', 'flirt4free.com', 'imlive.com', 'naked.com', 'xcams.com',
        'camster.com', 'cam-to-cam.com', 'xlovecam.com', 'live.sex', 'sexier.com',
        'sexcamly.com', 'chatforfree.org', 'livecamnetwork.com', 'sexchat.com',
        'webcamnow.com', 'freecams.com', 'cam2cam.com', 'adultfriendfinder.com',
        
        // ===== ADULT DATING & HOOKUPS =====
        'ashley-madison.com', 'alt.com', 'fling.com', 'benaughty.com',
        'passion.com', 'ashleymadison.com', 'hookupcloud.com', 'instabang.com',
        'snapfuck.com', 'sexmessenger.com', 'uberhorny.com', 'naughtydate.com',
        'flirtbuddies.com', 'xmatch.com', 'hotlocal.co', 'shagaholic.com',
        
        // ===== STRONY SZKODLIWE / GORE / SZOKUJĄCE =====
        'ptoszek.pl', 'kekma.net', 'meatspin.com', 'lemonparty.org', 'lemonparty.fr',
        '2girls1cup.com', 'bestgore.com', 'rotten.com', 'documentingreality.com',
        'liveleak.com', '1guy1jar.com', 'tubgirl.com', 'goatse.cx', 'goatse.ru',
        'pain4femalesub.com', 'stileproject.com', 'goregrish.com', 'ogrish.com',
        'theync.com', 'kaotic.com', 'seegore.com', 'hoodsite.com', 'crazyshit.com',
        'shockchan.com', 'cutedeadguys.net', 'heavy-r.com', 'deathdate.info',
        'bloodshows.com', 'goregasm.com', 'gorexxx.com', 'sickestvideos.com',
        'pornolab.net', 'bestshockers.com', 'thatvideosite.com', 'offended.org',
        
        // ===== GAMBLING / KASYNA / ZAKŁADY =====
        'bet365.com', '888casino.com', 'pokerstars.com', 'betfair.com',
        'williamhill.com', 'unibet.com', 'bwin.com', 'partypoker.com',
        '1xbet.com', 'betway.com', 'draftkings.com', 'fanduel.com',
        '22bet.com', 'betwinner.com', 'melbet.com', 'betano.com', 'parimatch.com',
        'netbet.com', '10bet.com', 'betsson.com', 'pinnacle.com', 'bovada.lv',
        'bet-at-home.com', 'titanbet.com', 'winner.com', 'betvictor.com',
        'ladbrokes.com', 'paddypower.com', 'coral.co.uk', 'skybet.com',
        'betfred.com', 'betdaq.com', 'sportingbet.com', 'caesars.com',
        '888poker.com', 'ggpoker.com', 'partypoker.com', 'pokerstars.es',
        'winamax.fr', 'fulltilt.com', 'betsafe.com', 'megapari.com',
        'stake.com', 'rollbit.com', 'roobet.com', 'duelbits.com', 'bc.game',
        
        // ===== TORRENTY / PIRACTWO / WAREZ =====
        'piratebay.org', 'thepiratebay.org', 'thepiratebay.se', 'thepiratebay.rocks',
        '1337x.to', '1337x.st', 'rarbg.to', 'rarbg.is', 'torrentz2.eu',
        'eztv.re', 'eztv.io', 'yts.mx', 'yts.am', 'yify-torrent.org',
        'kickasstorrents.to', 'katcr.co', 'torrentgalaxy.to', 'torrentdownloads.me',
        'limetorrents.info', 'torlock.com', 'zooqle.com', 'torrentz.eu',
        'extratorrent.cc', 'isohunt.to', 'demonoid.is', 'torrentfunk.com',
        'rutracker.org', 'rutracker.net', 'nnmclub.to', 'tapochek.net',
        'zamunda.net', 'filelist.io', 'torrentleech.org', 'iptorrents.com',
        'scene-rls.net', 'rlslog.net', 'scnsrc.me', 'pre.im',
        'warez-bb.org', 'ddlbase.net', 'warez.to', 'boerse.to', 'serienjunkies.org',
        
        // ===== CRACK / KEYGEN / SOFTWARE PIRACY =====
        'crackwatch.com', 'cracksurl.com', 'cracksnow.com', 'crack4windows.com',
        'getintopc.com', 'soft98.ir', 'downloadly.ir', 'nsaneforums.com',
        'cgpersia.com', 'gfxdomain.net', 'mobilism.org', 'apkmirror.com',
        'apkpure.com', 'happymod.com', 'revdl.com', 'androeed.ru',
        
        // ===== PHISHING / SCAM / FRAUD =====
        'freerobux.com', 'freevbucks.com', 'free-steam-wallet.com',
        'get-free-bitcoin.com', 'earnfreebitcoin.com', 'btc-generator.com',
        'free-fortnite-skins.com', 'roblox-free-robux.com', 'minecraft-free.net',
        'steamcommunity-login.com', 'stearncommunitty.com', 'stearncommunitty.ru',
        'paypal-secure.com', 'paypal-verify.com', 'paypal-update.com',
        'amazon-security.com', 'ebay-account.com', 'apple-support.com',
        'microsoft-account.com', 'netflix-billing.com', 'chase-secure.com',
        'wellsfargo-online.com', 'bankofamerica-secure.com',
        
        // ===== CRYPTO SCAMS =====
        'btc-doubler.com', 'eth-doubler.com', 'crypto-giveaway.com',
        'elon-crypto.com', 'bitcoin-code.com', 'crypto-revolt.com',
        'bitcoin-era.com', 'immediate-edge.com', 'bitcoin-profit.com',
        
        // ===== MALWARE / VIRUS / TROJANY =====
        'download-manager.com', 'get-flash-player.com', 'java-update.com',
        'codec-pack.com', 'driver-update.com', 'pc-speedup.com',
        'registry-cleaner.com', 'antivirus-free.com', 'spyware-removal.com',
        
        // ===== DARKNET / NARKOTYKI =====
        'silkroad.onion', 'alphabay.onion', 'dreammarket.onion', 'wallstreet.onion',
        'empire.market', 'white-house.market', 'versus.market',
        
        // ===== FAŁSZYWE PRODUKTY / PODRÓBKI =====
        'replica-watches.com', 'fake-designer.com', 'cheap-rolex.com',
        'designer-replica.com', 'aaa-replica.com',
        
        // ===== CHEATING / GAME HACKS =====
        'unknowncheats.me', 'mpgh.net', 'ownedcore.com', 'elitepvpers.com',
        'cheatengine.org', 'gamehacking.org', 'gamebanana.com',
        
        // ===== REVENGE PORN / DEEPFAKE =====
        'anon-ib.com', 'anon-v.com', 'anonib.com', 'thefappening.com',
        'celebjihad.com', 'phun.org', 'fappeningbook.com',
        'deepfakes.club', 'mrdeepfakes.com', 'deepfakespot.com',
        
        // ===== EKSTREMIZM / NIENAWIŚĆ =====
        'stormfront.org', '8chan.net', '8kun.top', '4chan.org/pol',
        'daily-stormer.name', 'gab.com', 'voat.co', 'parler.com',
        
        // ===== INNE NIEBEZPIECZNE =====
        'omegle.com', 'chatroulette.com', 'chatpig.com', 'bazoocam.org',
        'shagle.com', 'coomeet.com', 'emeraldchat.com', 'chatspin.com',

        // ===== DODATKOWE (RĘCZNIE DODANE) =====
        'testujkomputer.pl',
    ],
    
    // Lista zablokowanych słów kluczowych w domenach
    blockedKeywords: [
        // Pornografia
        'porn', 'xxx', 'sex', 'adult', 'nsfw', 'nude', 'naked', 'hentai',
        'cam', 'camgirl', 'webcam', 'livecam', 'escort', 'hooker', 'whore',
        'erotic', 'sexy', 'boobs', 'tits', 'pussy', 'cock', 'dick', 'fuck',
        'anal', 'oral', 'dildo', 'vibrator', 'fetish', 'bdsm', 'orgasm',
        
        // Dating dla dorosłych
        'hookup', 'sexdating', 'adultfriend', 'casualsex', 'onenightstand',
        'milf', 'cougar', 'sugardaddy', 'sugarbaby', 'affair', 'cheating',
        
        // Hazard
        'casino', 'gambling', 'gamble', 'poker', 'slots', 'blackjack',
        'roulette', 'betting', 'sportsbet', 'jackpot', 'lottery', 'bingo',
        'bookmaker', 'odds', 'wager', 'stake',
        
        // Leki / Viagra
        'viagra', 'cialis', 'levitra', 'kamagra', 'pharmacy', 'drugs',
        'pills', 'meds', 'prescription',
        
        // Scam / Phishing
        'scam', 'phishing', 'fraud', 'fake', 'counterfeit', 'replica',
        'generator', 'free-robux', 'free-vbucks', 'free-money',
        'get-rich', 'make-money-fast', 'earn-from-home',
        
        // Piractwo / Crack
        'crack', 'keygen', 'warez', 'torrent', 'pirate', 'illegal',
        'download-free', 'full-version', 'serial', 'patch', 'nulled',
        
        // Gore / Szokujące
        'gore', 'shock', 'disturbing', 'extreme', 'snuff', 'death',
        'murder', 'torture', 'brutal', 'violent',
        
        // Malware
        'malware', 'virus', 'trojan', 'spyware', 'adware', 'ransomware',
        
        // Cheating / Hacking
        'cheat', 'hack', 'exploit', 'aimbot', 'wallhack', 'maphack',
        
        // Crypto scams
        'doubler', 'crypto-giveaway', 'bitcoin-generator', 'eth-free',
        
        // Revenge porn / Deepfake
        'deepfake', 'fappening', 'leaked-nudes', 'revenge',
        
        // Narkotyki
        'drug', 'cocaine', 'heroin', 'marijuana', 'weed', 'cannabis',
        'mdma', 'lsd', 'meth', 'darknet', 'darkweb',
    ],
    
    // Dozwolone wyjątki (np. legitne strony zawierające zablokowane słowa)
    allowedExceptions: [
        // Uniwersytety zawierające "sex" w nazwie
        'sexism.org',           // Strona o dyskryminacji
        'sussex.ac.uk',         // University of Sussex
        'middlesex.edu',        // Middlesex University
        'essex.ac.uk',          // University of Essex
        'westsussex.gov.uk',    // West Sussex Council
        'eastsussex.gov.uk',    // East Sussex Council
        
        // Legitne strony z słowem "sex" w nazwie
        'sexta-feira.pt',       // Piątek po portugalsku
        'sexto.com',            // Szósty
        'osexpress.com',        // South of England Express
        'oysex.no',             // Norweski region
        
        // Medyczne/edukacyjne
        'sexuality.org',        // Edukacja seksualna
        'sexualhealth.org',     // Zdrowie seksualne
        'sexed.org',            // Edukacja
        'plannedparenthood.org', // Planned Parenthood
        
        // Gaming legitne
        'bethesda.net',         // Bethesda (zawiera "bet")
        'betweenworlds.com',    // Between Worlds
        
        // Inne legitne
        'tibettravel.com',      // Podróże do Tybetu (zawiera "bet")
        'alphabet.com',         // Google Alphabet (zawiera "bet")
        'diabetes.org',         // Diabetes org (zawiera "bet")
        'exeter.ac.uk',         // University of Exeter (zawiera "sex")
        'sexauer.com',          // Nazwisko (legitna firma)
    ]
};

export default blockedDomainRules;
