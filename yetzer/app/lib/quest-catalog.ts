import { ROUTES, type QuestKind } from "./domain";

// Authored base recipes. Daily releases copy these records without changing them.
const edit = `
The invisible umbrella|Film yourself opening an imaginary umbrella and looking up.|Add a small rain cloud above the umbrella while the room stays dry.
The doorway aquarium|Film yourself opening a door and peeking around it.|Replace the room beyond the doorway with a bright aquarium tunnel.
The reluctant suitcase|Film yourself gently pulling a small bag across the floor.|Give the bag tiny sleepy feet that drag behind it.
Your royal entrance|Film a slow entrance and a modest bow.|Turn the doorway into a cheerful miniature royal reception.
Cloud folding|Film yourself folding a small towel on a table.|Make the towel look like a soft cloud without changing the folding action.
The paper moon|Film yourself lifting a round paper cutout.|Make the paper glow like a pocket-sized moon.
The cosmic stir|Film yourself slowly stirring a cup of cold water.|Add a tiny star swirl inside the cup, keeping your hand unchanged.
The very small parade|Film yourself walking slowly past a table.|Add a tiny paper parade along the table edge.
Socks on the red carpet|Film yourself showing off a pair of socks.|Replace the floor with a glamorous red carpet and camera flashes.
The patient waterfall|Film yourself holding a clear empty bowl under a tap that is off.|Add a little ribbon of glowing water flowing into the bowl.
A secret in the drawer|Film yourself opening an empty drawer and reacting.|Fill the drawer with gently floating paper stars.
The golden yawn|Film a big comfortable stretch and yawn.|Add a small sunrise glow behind you as you stretch.
The tiny storm captain|Film yourself pointing a wooden spoon across a table.|Make the tabletop a miniature cloudy sea around the spoon.
The garden elevator|Film yourself standing still and looking slowly upward.|Turn the background into a glass lift rising through a giant garden.
The grumpy bouquet|Film yourself politely offering an empty cup.|Fill the cup with cartoon flowers that look mildly unimpressed.
Pocket spotlight|Film yourself taking a small torch from a pocket.|Turn the torch beam into a warm theatrical spotlight.
The enchanted laundry|Film yourself hanging one scarf over a chair.|Make little constellations appear on the scarf.
The friendly security laser|Film yourself stepping carefully over a rolled towel.|Replace the towel with one soft glowing light beam.
A toast to Tuesday|Film yourself raising a cup of water in a tiny celebration.|Add a little burst of colorful paper confetti above the cup.
The slow-motion office hero|Film yourself placing a pen on a desk with exaggerated care.|Turn the pen into a glowing ceremonial artifact.
The marshmallow throne|Film yourself sitting in an ordinary chair and waving.|Give the chair soft cloud cushions and a playful crown-shaped back.
The window orchard|Film yourself looking through a window and waving.|Replace the view outside with a bright orchard of oversized fruit.
The meteor catch|Film yourself catching a gently tossed soft ball.|Give the ball a harmless sparkling comet trail.
The polite dragon egg|Film yourself inspecting a smooth stone in your palm.|Turn the stone into a softly glowing speckled egg.
The secret bookshelf|Film yourself taking a book from a shelf.|Make the space behind that book glow with a tiny distant city.
The glowing footprints|Film a few slow steps on a clear floor.|Add gentle glowing footprints exactly behind the visible steps.
The velvet detective|Film yourself inspecting a table with a toy magnifier.|Turn the tabletop into an oversized detective map without readable text.
The jellyfish ceiling|Film yourself looking upward with a surprised smile.|Add a few translucent floating jellyfish above your head.
The moonlight haircut|Film yourself brushing your hair gently.|Add soft moonlight sparkles to the brush trail without changing your face.
The disappearing crumbs|Film yourself sweeping paper scraps into a pile.|Make the scraps glow and gather into a little star-shaped pile.
The cardboard castle gate|Film yourself lifting a cardboard flap.|Turn the flap into a miniature castle gate on the same table.
The sleepy telescope|Film yourself looking through a rolled paper tube.|Make the far end of the tube show a small glowing planet.
The dramatic bookmark|Film yourself sliding a bookmark into a closed book.|Make a brief colored glow escape between the pages.
The underwater desk|Film yourself calmly writing at a desk.|Replace the background with a sunlit underwater research room.
The feather handshake|Film yourself shaking your own other hand as a silly greeting.|Add a small cloud of feathers around the handshake.
The peppermint staircase|Film yourself carefully stepping onto a low safe platform.|Give the platform a colorful candy-like surface.
The balloon wristwatch|Film yourself checking your bare wrist and looking puzzled.|Add a tiny balloon-shaped clock with no readable numbers.
The pocket weather report|Film yourself opening an empty palm and reacting.|Add a little sun and cloud hovering above your palm.
The invisible orchestra|Film yourself conducting three gentle beats.|Add floating musical light ribbons around your hands.
The curtain sunrise|Film yourself slowly pulling back a curtain.|Reveal a vivid sunrise over a fictional floating town outside.
The secret flower button|Film yourself pressing a large paper circle on a table.|Make a small mechanical flower open above the circle.
The porcelain snow globe|Film yourself slowly turning an empty jar.|Fill it with a tiny snowy village behind the glass.
The lemon submarine|Film yourself rolling a lemon gently across a table.|Give the lemon small submarine windows and a soft wake.
The kitchen diplomat|Film yourself shaking a wooden spoon solemnly.|Turn the spoon into a tiny ceremonial microphone.
The starry shoelace|Film yourself tying a shoelace while seated.|Make the tied lace briefly sparkle like a constellation.
The velvet vacuum trail|Film yourself moving an unplugged vacuum over a small clear area.|Make the cleaned path reveal a colorful patterned carpet.
The patient lighthouse|Film yourself slowly turning a flashlight across a wall.|Turn the wall into a miniature coastline under the moving light.
The hat greenhouse|Film yourself lifting a hat from a table.|Reveal a tiny green garden beneath the hat.
The rainbow handshake deal|Film yourself giving a friendly thumbs-up.|Add a small rainbow ribbon circling the raised thumb.
The origami sunrise|Film yourself opening a folded paper fan.|Make the fan glow with a gentle sunrise gradient.
The secret garden knock|Film yourself knocking gently on a cupboard.|Make tiny leaves appear around the cupboard edges.
The tiny luggage carousel|Film yourself rotating a plate holding a toy bag.|Turn the plate into a miniature airport carousel.
The floating teabag|Film yourself lifting a dry teabag over a cup.|Make the teabag resemble a tiny hot-air balloon.
The velvet stage manager|Film yourself drawing a small curtain of fabric aside.|Reveal a tiny empty stage with warm lights behind it.
The sparkling finish line|Film yourself taking one small step over a string on the floor.|Add a cheerful finish-line ribbon and gentle confetti.
`;
const perform = `
The breakfast robot audition|Photograph a breakfast item and record three silly machine sounds.|Animate a tiny breakfast robot starting up to your sound reference.
The cloud customer service desk|Take a clear portrait and record a polite complaint about the weather.|Create a playful cloud-office scene inspired by your delivery.
The sleepy spaceship alarm|Photograph a toy or handmade spaceship and record a sleepy alarm sound.|Show the little ship waking up very reluctantly.
The royal sandwich announcement|Photograph your sandwich and record a grand introduction.|Give the sandwich a theatrical royal reveal with tiny curtains.
The pocket jungle orchestra|Photograph a leafy plant and record three invented jungle sounds.|Turn the plant into a miniature lively jungle performance.
The teacup train whistle|Photograph a cup and record your best gentle train whistle.|Turn the cup into a small cheerful station with a departing toy train.
The dramatic laundry narrator|Photograph folded laundry and narrate its heroic return to the cupboard.|Show an exaggerated ceremonial procession of folded clothes.
The biscuit weather forecast|Photograph a biscuit and record a forecast for its imaginary country.|Create a whimsical biscuit landscape under changing miniature weather.
The most nervous doorbell|Photograph a handmade doorway and record a shy doorbell sound.|Animate the doorway as though it is nervous about visitors.
The vegetable talent show|Photograph a vegetable and introduce its unusual talent.|Give it a short charming stage moment without copying a real performer.
The polite monster greeting|Photograph a soft toy and record a friendly greeting.|Animate the toy as a gentle monster saying hello in a cozy setting.
The paper boat radio|Photograph a paper boat and record a short fictional captain's message.|Send the boat through a playful tabletop voyage.
The pencil race announcer|Photograph two pencils and record an excited finish-line announcement.|Animate a tiny pencil race with a comic close finish.
The sock opera rehearsal|Photograph a sock puppet and record a short original sung note.|Create a tiny opera rehearsal with expressive puppet movement.
The elevator to somewhere nice|Photograph a paper elevator button and record a destination announcement.|Open an imaginary lift onto a bright surprising holiday scene.
The tiny bakery opening|Photograph a homemade bakery sign without brand names and record an opening cheer.|Reveal a miniature busy bakery with inviting warm light.
The moon's voicemail|Photograph a round lamp and record a short message from a sleepy moon.|Turn the lamp into a moon resting above a little town.
The cardboard race engine|Photograph a toy car and record three engine noises.|Animate a playful garage test driven by the energy of your recording.
The mushroom tour guide|Photograph a mushroom or its drawing and record a welcome to its house.|Reveal a cozy miniature mushroom home.
The dramatic button inspector|Take a portrait and explain why one ordinary button deserves an award.|Create an absurdly formal inspection scene with oversized buttons.
The jellybean emergency meeting|Photograph a few colorful sweets and record a mock-serious meeting introduction.|Gather them around a tiny conference table.
The rainstick rainforest|Photograph a handmade shaker and record it rattling softly.|Reveal a small rainforest responding to the sound's atmosphere.
The paper dragon sneeze|Photograph a dragon drawing and record a funny gentle sneeze.|Animate a friendly dragon sneezing a few paper stars.
The desk bell detective|Photograph a small bell and record a mysterious case introduction.|Create a whimsical detective-office reveal centered on the bell.
The flower shop whisper|Photograph flowers and record a secret compliment for them.|Animate a small friendly flower-shop scene with a warm mood.
The hat's travel diary|Photograph your hat and narrate one fictional place it visited.|Create a postcard-like scene of the hat in that invented location.
The clock that wants a break|Photograph a clock and record its imaginary request for a holiday.|Animate the clock relaxing on a little beach.
The invisible pet introduction|Photograph an empty cushion and describe an imaginary harmless pet.|Reveal a playful creature suggested by your description on the cushion.
The pebble museum curator|Photograph a pebble and record a very serious museum introduction.|Display the pebble in a grand miniature gallery.
The cheerful printer error|Photograph a paper machine drawing and record a funny error sound.|Animate a friendly paper machine making colorful harmless confetti.
The pocket ocean broadcast|Photograph a seashell and record a fictional underwater greeting.|Build a bright little ocean scene around the shell.
The cardboard knight pledge|Photograph a cardboard shield and record a brave promise about a tiny chore.|Show a cheerful miniature knight preparing for that ordinary mission.
The suitcase holiday jingle|Photograph a small bag and hum a short original travel tune.|Animate a sunny departure scene around the bag.
The spoon spaceship countdown|Photograph a spoon and record a playful countdown.|Launch a spoon-shaped toy ship from a kitchen-sized spaceport.
The sleepy library dragon|Photograph a book and record a quiet dragon-like yawn.|Reveal a tiny dragon curling up beside the book.
The pretzel traffic controller|Photograph a pretzel and record a polite traffic announcement.|Turn its curves into a miniature cheerful road junction.
The rainbow repair hotline|Take a portrait and offer advice to a rainbow missing a color.|Create a bright fictional repair desk with color ribbons.
The tiny concert ticket|Photograph a handmade ticket and record a short original rhythmic beat.|Reveal a miniature concert stage inspired by your beat.
The fruit rocket launch host|Photograph a piece of fruit and introduce its first space mission.|Show a playful fruit rocket preparing for lift-off.
The bookmark bedtime voice|Photograph a bookmark and record one original gentle bedtime sentence.|Animate a peaceful tiny night scene along the bookmark.
The imaginary train station|Photograph a station sketch and record a made-up destination name.|Bring the sketch into a cheerful miniature station scene.
The very proud dust bunny|Photograph a harmless cotton puff and record its proud introduction.|Animate a tiny cotton character at a miniature awards podium.
The plant's motivational speech|Photograph a houseplant and record encouragement for a shy new leaf.|Show a playful warm scene of the plant stretching toward light.
The rubber duck interview|Photograph a bath toy and ask it one funny question in your recording.|Create a whimsical toy interview set with a comic reaction.
The drawer treasure documentary|Photograph three ordinary drawer objects and narrate one as a rare discovery.|Give that object a dramatic miniature expedition reveal.
The marshmallow mission control|Photograph a marshmallow or cotton model and record a launch instruction.|Animate a soft little mission-control room.
The notebook thunder machine|Photograph a notebook and record quiet rumbling with your voice.|Show a tiny weather workshop opening between its pages.
The cup percussion cafe|Photograph an empty cup and record a short tapped rhythm.|Create a bright miniature cafe scene with a rhythmic atmosphere.
The cushion cloud pilot|Photograph a cushion and record a calm fictional flight announcement.|Turn the cushion into a friendly cloud airship.
The lemon comedy club|Photograph a lemon and tell a short original clean joke.|Create a small cheerful comedy stage centered on the lemon.
The shoebox station master|Photograph a shoebox and record a welcome-home announcement.|Turn the box into a tiny welcoming train station.
The cardboard planet greeting|Photograph a planet drawing and record an invented alien greeting.|Animate a friendly first-contact scene on the drawn planet.
The cereal treasure guide|Photograph a cereal bowl and narrate a tiny treasure hunt.|Create an adventurous miniature cereal landscape.
The mitten mountain announcer|Photograph a mitten and announce the opening of its imaginary mountain resort.|Reveal a cozy little winter resort on the mitten.
The quiet fireworks conductor|Photograph a night-sky drawing and record three soft popping sounds.|Animate small colorful paper-like fireworks in the drawn sky.
`;
const imagine = `
The runaway shopping list|Film yourself pointing to a blank sheet then looking surprised.|The sheet folds into a little bird and glides around a bright room.
The dragon's lost mitten|Film yourself picking up a mitten and looking around.|A tiny friendly dragon arrives to claim its oversized lost mitten.
The snack-sized planet|Film yourself examining a piece of fruit.|The fruit becomes a small orbiting planet above your hand.
The emergency disco button|Film yourself pressing a handmade button then making one dance move.|The room becomes a cheerful miniature disco with playful lights.
The invisible lift operator|Film yourself standing still and announcing a fictional floor.|An imaginary lift opens onto an impossible bright destination.
The suspiciously polite robot|Film yourself offering a friendly handshake to empty space.|A small original robot approaches and attempts an overly formal greeting.
The pancake detective|Film yourself investigating a plate with mock seriousness.|A miniature detective world appears around a mysterious pancake.
The accidental cloud shepherd|Film yourself gently guiding an imaginary flock.|A few small clouds gather and follow your gesture through the room.
The bookshelf ferry|Film yourself looking along a shelf and waving goodbye.|A tiny ferry sails between the books on a ribbon of water.
The star delivery mistake|Film yourself accepting an imaginary parcel then peeking inside.|The parcel contains a little star that floats up looking for its address.
The umbrella flower market|Film yourself opening and closing a folded umbrella safely.|The umbrella becomes a small cheerful flower stall.
The terribly small giant|Film yourself reacting to something tiny near your shoe.|A miniature giant proudly tries to look intimidating beside your shoe.
The noodle bridge engineer|Film yourself pointing across a plate and nodding thoughtfully.|A playful miniature noodle bridge rises across the plate.
The bubble courier|Film yourself passing an imaginary delicate parcel between your hands.|A glowing bubble carries a tiny letter through a bright scene.
The carpet island explorer|Film yourself taking two careful steps across a rug.|The rug becomes a small floating island with a friendly lookout tower.
The paper crown election|Film yourself placing a paper crown on an ordinary object.|Tiny imaginary citizens celebrate their unexpected new ruler.
The very late comet|Film yourself checking the time and waving someone onward.|A small tired comet hurries past trailing colorful paper stars.
The cookie compass|Film yourself turning a biscuit in your hand and choosing a direction.|The biscuit becomes a playful compass pointing toward a tiny adventure.
The silent trumpet parade|Film yourself pretending to play a small imaginary trumpet.|A parade of colorful paper creatures appears around the gesture.
The floating picnic|Film yourself setting down a small snack on a napkin.|The picnic lifts gently onto a little cloud above the table.
The dragon parking attendant|Film yourself pointing to a safe empty spot and giving a thumbs-up.|A tiny friendly dragon carefully parks a toy-sized airship there.
The impossible snowball|Film yourself rolling a soft ball between your hands.|The ball becomes a glowing summer snowball with a tiny garden inside.
The suitcase's first date|Film yourself placing two small bags next to each other.|The bags become shy animated characters meeting at a tiny cafe.
The sleepy sun replacement|Film yourself switching on a lamp and stretching.|A miniature sun reluctantly takes its place above a little city.
The chair on vacation|Film yourself waving goodbye to an empty chair.|The chair sprouts little wheels and rolls toward an imaginary beach.
The tiny rain inspector|Film yourself checking an empty cup with a serious expression.|A miniature inspector arrives to test a small indoor rain cloud.
The origami rescue crew|Film yourself pointing at a harmless paper object on a table.|A little origami rescue team arrives with hilariously oversized equipment.
The toast-powered engine|Film yourself presenting a slice of toast like precious fuel.|A small cheerful machine wakes up beside the toast.
The shadow's coffee break|Film yourself standing still then making a small surprised gesture.|Your fictional shadow counterpart relaxes in a tiny chair beside you.
The mountain in a mug|Film yourself peering into an empty mug.|A bright miniature mountain landscape appears inside the mug.
The pillow airship captain|Film yourself holding a cushion like a ship's wheel.|A whimsical cushion airship sails through soft daylight clouds.
The reluctant rainbow painter|Film yourself painting a short stroke on blank paper.|The stroke grows into a little rainbow that refuses to stay straight.
The marble spaceport|Film yourself rolling a marble slowly across a tray.|The marble arrives at a miniature glowing spaceport.
The sock tunnel mystery|Film yourself looking into an empty sock and reacting.|The sock opens onto a bright little tunnel with a curious creature.
The teapot lighthouse keeper|Film yourself turning an empty teapot gently.|The teapot becomes a lighthouse guiding tiny paper boats.
The flower's tiny assistant|Film yourself offering a drop of water to a plant.|A small invented garden helper appears to supervise the watering.
The flying receipt|Film yourself holding a blank strip of paper up to the light.|The strip becomes a playful flying banner circling a miniature town.
The blanket mountain rescue|Film yourself making a small hill from a blanket.|A tiny expedition appears and celebrates reaching its soft summit.
The candleless birthday wish|Film yourself making a wish over a cupcake with no flame.|A friendly little wish creature pops out in colorful light.
The pocket-sized museum theft|Film yourself guarding a small harmless object very seriously.|A tiny comic thief tries and fails to sneak past your watch.
The button moon mission|Film yourself examining a large button on a table.|A miniature lunar rover explores the button's surface.
The friendly cereal sea monster|Film yourself looking surprised into an empty bowl.|A tiny cheerful sea creature rises from a colorful cereal ocean.
The scarf roller coaster|Film yourself laying a scarf in a winding line.|A little toy carriage rides a whimsical scarf-shaped coaster.
The pencil forest ranger|Film yourself planting pencils upright in a holder.|A miniature forest ranger explores the new pencil forest.
The jar of lost applause|Film yourself opening an empty jar and smiling.|Little glowing hands and paper stars drift out in celebration.
The slippers' moonwalk|Film your feet making a simple safe shuffle in slippers.|The slippers become playful lunar boots on a tiny colorful moon stage.
The hedgehog umbrella shop|Film yourself showing a folded paper umbrella.|A tiny original hedgehog shopkeeper proudly opens a miniature umbrella stall.
The kite that ordered lunch|Film yourself handing an imaginary sandwich upward.|A small playful kite swoops down for its ridiculous lunch delivery.
The compass for bad ideas|Film yourself turning in place and choosing a silly direction.|A whimsical compass leads toward an obviously harmless absurd destination.
The plush toy lifeguard|Film yourself setting a soft toy beside a bowl of water.|The toy becomes a proud lifeguard at a miniature pool.
The bookshop on wheels|Film yourself sliding a closed book across a table.|The book transforms into a little traveling bookshop.
The fruit bowl observatory|Film yourself looking at a fruit bowl with wonder.|A miniature observatory unfolds among the fruit.
The tiny cloud mechanic|Film yourself pretending to tighten a bolt in the air.|A little cloud engine appears for your imaginary repair.
The picnic napkin portal|Film yourself lifting one corner of a napkin.|A playful miniature picnic world is revealed beneath it.
The medal for almost trying|Film yourself attempting a tiny ordinary task then giving a sheepish smile.|A whimsical committee awards an absurdly grand medal for the attempt.
`;
const adventure = `
The parcel with no address|Film yourself finding a small blank box and deciding to help it.|You follow a glowing trail through a bright invented town and deliver the box to a tiny grateful creature.
The lost cloud returns home|Film yourself gently guiding an imaginary cloud toward a window.|A little cloud leads you through a whimsical sky station before finding its cheerful family.
The planet's first picnic|Film yourself packing one snack and waving goodbye.|Your outing becomes a gentle journey to a colorful little planet for its first picnic.
The accidental lighthouse keeper|Film yourself turning a torch and looking out into the distance.|You guide a tiny paper fleet safely toward a warm miniature harbor.
The library of unfinished yawns|Film yourself yawning into a closed book and opening it.|A whimsical night library wakes up and helps you return a lost dream to its shelf.
The roller-skating bakery|Film yourself carrying an empty tray carefully across a clear floor.|A playful mobile bakery rolls through a fictional town as you try to deliver one perfect pastry.
The very small expedition|Film yourself examining a harmless object through a paper tube.|A tiny expedition recruits you to cross a dramatic tabletop landscape.
The moon forgot its luggage|Film yourself discovering a small bag and looking upward.|You travel through a cheerful cloud terminal to return the bag to a forgetful moon.
The garden's secret cinema|Film yourself parting two leaves and peeking between them.|A miniature outdoor cinema reveals a gentle silent adventure among garden creatures.
The paper boat regatta|Film yourself placing a paper boat on a dry tray and cheering.|A bright miniature regatta begins and your boat finds a surprising friendly shortcut.
The umbrella repair expedition|Film yourself inspecting a folded umbrella with mock concern.|You visit a colorful floating workshop to repair the umbrella's imaginary weather engine.
The clock's day off|Film yourself setting down a small clock and waving it away.|The clock explores a playful seaside town and learns to enjoy doing nothing.
The last biscuit diplomat|Film yourself presenting a biscuit with ceremonial seriousness.|You negotiate a cheerful peace between two tiny imaginary snack kingdoms.
The pillow train journey|Film yourself arranging cushions like seats and looking out a window.|A soft little train carries you through colorful landscapes to a cozy invented destination.
The shoebox theater premiere|Film yourself opening a decorated shoebox and bowing.|A miniature theater inside stages a playful opening night inspired by your gesture.
The cloud seed delivery|Film yourself carefully carrying a few paper circles in your palm.|You plant imaginary cloud seeds across a bright tiny town and watch gentle clouds bloom.
The suitcase mapmaker|Film yourself opening a bag and drawing an imaginary route.|The bag reveals a whimsical landscape that unfolds into a short friendly expedition.
The lighthouse in the lemon|Film yourself turning a lemon and spotting something surprising.|A miniature coastal village asks you to help relight its lemon-shaped lighthouse.
The comet's driving lesson|Film yourself giving slow careful steering gestures.|You coach a tiny nervous comet through a cheerful training course in space.
The museum after closing|Film yourself guarding an ordinary object then hearing an imaginary noise.|A miniature museum exhibit wakes up and invites you on a harmless after-hours tour.
The friendly dragon post office|Film yourself sealing a blank envelope and presenting it.|A little dragon postal crew helps your letter cross a bright fictional landscape.
The concert inside the cupboard|Film yourself opening a cupboard and making a conductor's gesture.|A miniature orchestra prepares a playful concert among ordinary household objects.
The scarf bridge crossing|Film yourself laying out a scarf and tracing a route with your finger.|A tiny traveling party crosses a colorful scarf bridge toward a welcoming village.
The toast-powered railway|Film yourself offering a piece of toast like a conductor's ticket.|A cheerful miniature railway carries you past strange breakfast landscapes.
The pebble astronaut academy|Film yourself selecting a pebble and giving it a proud salute.|Your pebble becomes a tiny astronaut completing a playful training mission.
The lantern fish invitation|Film yourself noticing an imaginary glow and following it with your eyes.|A friendly floating fish leads you through a bright magical underwater market.
The greenhouse cloud exchange|Film yourself offering an empty plant pot and smiling.|A whimsical cloud seller helps you grow a tiny indoor weather garden.
The pocket carnival opens|Film yourself emptying a few harmless trinkets onto a table.|The trinkets become a miniature carnival with one cheerful ride opening for you.
The birthday of a mountain|Film yourself presenting a paper party hat to a small stone.|A miniature mountain village prepares a funny birthday celebration for its mountain.
The detective and the missing mitten|Film yourself examining one mitten and choosing a direction.|A warm comic detective journey discovers the missing mitten at an unexpected tiny cafe.
The train to the wrong Tuesday|Film yourself checking a handmade ticket and reacting with surprise.|A colorful time-themed train brings you to a harmless alternate version of an ordinary day.
The rain collector's holiday|Film yourself carrying an empty jar and searching the sky.|You visit playful miniature weather stations to collect one perfect drop of sunshine rain.
The toy boat's big interview|Film yourself introducing a toy boat with a serious gesture.|The boat auditions for an absurdly prestigious job on a cheerful miniature ocean.
The blanket kingdom festival|Film yourself building a small blanket hill and waving a paper flag.|A friendly little kingdom celebrates a bright festival across the soft landscape.
The flower that wanted a window|Film yourself moving a plant toward daylight.|A whimsical flower leads a gentle expedition to find the best window in an impossible house.
The secret staircase in a book|Film yourself opening a book and tracing a path across its page.|An imagined staircase unfolds into a bright miniature adventure between the pages.
The forgotten balloon station|Film yourself holding an imaginary balloon string and looking puzzled.|You discover a cheerful station where lost balloons wait for their next adventure.
The cardboard ocean rescue|Film yourself pointing a cardboard telescope toward a small paper boat.|A miniature rescue crew helps the boat through a playful paper sea.
The cloud cafe's first customer|Film yourself sitting down and ordering an imaginary drink.|A shy cloud cafe prepares its first strange but delightful order for you.
The spoon-shaped submarine tour|Film yourself guiding a spoon through the air like a tiny vehicle.|A whimsical spoon submarine explores a bright safe underwater garden.
The secret of the quiet bell|Film yourself ringing an imaginary bell and listening closely.|A tiny town wakes in stages and reveals a playful surprise celebration.
The moonlit mitten delivery|Film yourself carrying a mitten carefully to a window.|A friendly night courier helps deliver warmth to a little moon village.
The village in the pencil case|Film yourself unzipping a pencil case and peeking inside.|A busy miniature village asks you to help open its colorful new bridge.
The kite's first seaside trip|Film yourself guiding an imaginary kite with gentle hand movements.|A timid little kite explores a bright invented coastline and finds its confidence.
The very formal garden party|Film yourself welcoming an imaginary guest with an exaggerated bow.|A whimsical garden party fills with original miniature guests and one harmless comic mishap.
The map of comfortable places|Film yourself pointing to three cozy corners around you.|Those corners become stops on a warm imaginative journey through a tiny comfort-themed world.
The sleepy robot road trip|Film yourself waking up and making a slow steering gesture.|A little sleepy robot takes a cheerful journey toward the world's smallest sunrise.
The sock puppet space embassy|Film yourself making a sock puppet greet an imaginary visitor.|The puppet hosts a friendly first meeting at a colorful miniature space embassy.
The jar's invisible orchestra|Film yourself opening a jar and listening with delight.|An imagined orchestra emerges and leads a short cheerful parade through a tiny town.
The paper star homecoming|Film yourself lifting a handmade paper star toward the sky.|A gentle adventure carries the star through a bright sky village to its welcoming home.
The hat that became a harbor|Film yourself placing a hat upside down and looking inside.|A miniature harbor opens in the hat and welcomes a playful fleet of paper boats.
The biscuit mountain railway|Film yourself arranging a biscuit on a plate and tracing a winding path.|A little train explores a dramatic but friendly biscuit mountain landscape.
The notebook's hidden fairground|Film yourself opening a notebook and tapping its blank page.|A colorful miniature fairground unfolds and invites you on one short imaginary ride.
The umbrella sky librarian|Film yourself holding a folded umbrella like a ceremonial staff.|You help a whimsical sky librarian return a wandering cloud story to its shelf.
The ordinary object's grand return|Film yourself picking up a favorite harmless object and welcoming it back.|The object returns from a playful invented journey and receives an absurdly warm miniature parade.
`;

const groups: [QuestKind, string, number][] = [["edit", edit, 12], ["perform", perform, 12], ["imagine", imagine, 15], ["adventure", adventure, 30]];
export const QUEST_CATALOG = groups.flatMap(([kind, content, duration]) => {
  const rows = content.trim().split("\n");
  if (rows.length !== 55) throw new Error(`${kind} must have 55 authored quests; found ${rows.length}`);
  return rows.map((line, index) => {
    const [title, preparation, transformation] = line.split("|");
    if (!title || !preparation || !transformation) throw new Error("Incomplete quest recipe");
    return {
      id: `${kind}-${String(index + 1).padStart(3, "0")}`, title,
      invitation: kind === "edit" ? "Your real moment, with one impossible twist." : kind === "perform" ? "Give an ordinary thing a little of your voice." : kind === "imagine" ? "Bring your own moment. Let something impossible happen." : "Step into a little adventure made from your own moment.",
      preparation, transformation, kind, duration,
      preserve: kind === "edit" ? "Keep the source person's identity, visible performance, timing and original audio. Change only the described visual elements." : kind === "perform" ? "Use the supplied image as the visual reference and the supplied audio as the voice or sound reference. Do not invent extra dialogue." : "Use the supplied video as the main performance and identity reference. Invent only the described setting and events; exact motion replication is not promised.",
      model: ROUTES[kind].model, resolution: ROUTES[kind].resolution,
    };
  });
});
if (new Set(QUEST_CATALOG.map(q => q.title)).size !== 220) throw new Error("Quest titles must be unique.");
