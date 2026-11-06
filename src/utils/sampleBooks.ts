import { ToneId } from '../types.ts';

export interface SampleBook {
  id: string;
  title: string;
  originalTitle: string;
  author: string;
  tone: ToneId;
  description: string;
  excerpt: string;
}

export const SAMPLE_BOOKS: SampleBook[] = [
  {
    id: 'power_of_now',
    title: 'نیروی حال (قدرت زمان حال)',
    originalTitle: 'The Power of Now: A Guide to Spiritual Enlightenment',
    author: 'Eckhart Tolle',
    tone: 'spiritual',
    description: 'کتاب شاهکار معنوی اکهارت تله با موضوع حضور، آگاهی ناب، رهایی از ذهن شرطی‌شده و مشاهده‌گر خاموش بودن.',
    excerpt: `Chapter 1: You Are Not Your Mind

The greatest obstacle to enlightenment is mind identification, which causes thought to become compulsive. Not to be able to stop thinking is a dreadful affliction, but we don't realize this because almost everybody is suffering from it, so it is considered normal. This incessant mental noise prevents you from finding that realm of inner stillness that is inseparable from Being. It also creates a false mind-made self that casts a shadow of fear and suffering.

The philosopher Descartes believed he had found the most fundamental truth when he made his famous statement: "I think, therefore I am." He had, in fact, given expression to the most basic error: to equate thinking with Being and identity with thinking. The compulsive thinker lives in a state of apparent separateness, in an insanely complex world of continuous problems and conflict, a world that reflects the ever-increasing fragmentation of the mind.

Enlightenment is a state of wholeness, of being "at one" and therefore at peace. At one with the manifested world as well as at one with yourself at the deepest level — the Unmanifested. It is not only the end of suffering and of continuous conflict within and without, but also the end of the dreadful enslavement to incessant thinking.

To listen to the voice in your head, be there as the witnessing presence. When you listen to that voice, listen impartially. That is to say, do not judge. Do not judge or condemn what you hear, for doing so would mean that the same voice has come in again through the back door. You will soon realize: there is the voice, and here I am listening to it, watching it. This I am realization, this sense of your own presence, is not a thought. It arises from beyond the mind.

So when you listen to a thought, you are aware not only of the thought but also of yourself as the witness of the thought. A new dimension of consciousness has come in. As you listen to the thought, you feel a conscious presence — your deeper self — behind or underneath the thought, as it were. The thought then loses its power over you and quickly subsides, because you are no longer energizing the mind through identification with it. This is the beginning of the end of involuntary and compulsive thinking.`,
  },
  {
    id: 'atomic_habits',
    title: 'عادت‌های اتمی',
    originalTitle: 'Atomic Habits: An Easy & Proven Way to Build Good Habits & Break Bad Ones',
    author: 'James Clear',
    tone: 'self_help',
    description: 'کتاب تحسین‌شده جیمز کلیر درباره سیستم‌های تغییر رفتار، چرخه عادت‌ها و بهبود ۱ درصدی روزانه.',
    excerpt: `Chapter 1: The Surprising Power of Atomic Habits

It is so easy to overestimate the importance of one defining moment and underestimate the value of making small improvements on a daily basis. Too often, we convince ourselves that massive success requires massive action. Whether it is losing weight, building a business, writing a book, winning a championship, or achieving any other goal, we put pressure on ourselves to make some earth-shattering improvement that everyone will talk about.

Meanwhile, improving by 1 percent isn't particularly notable — sometimes it isn't even noticeable — but it can be far more meaningful, especially in the long run. The difference a tiny improvement can make over time is astounding. Here is how the math works out: if you can get 1 percent better each day for one year, you'll end up thirty-seven times better by the time you're done. Conversely, if you get 1 percent worse each day for one year, you'll decline nearly down to zero. What starts as a small win or a minor setback accumulates into something much more.

Habits are the compound interest of self-improvement. The same way that money multiplies through compound interest, the effects of your habits multiply as you repeat them. They seem to make little difference on any given day and yet the impact they deliver over the months and years can be enormous. It is only when looking back two, five, or perhaps ten years later that the value of good habits and the cost of bad ones becomes strikingly apparent.

If you find yourself struggling to build a good habit or break a bad one, it is not because you have lost your ability to improve. It is often because you have not yet crossed the Plateau of Latent Potential. When you finally break through the Plateau of Latent Potential, people will call it an overnight success. The outside world only sees the most dramatic event rather than all that preceded it. But you know that it's the work you did long ago — when it seemed that you weren't making any progress — that makes the jump today possible.`,
  },
  {
    id: 'meditations',
    title: 'تأملات',
    originalTitle: 'Meditations',
    author: 'Marcus Aurelius',
    tone: 'spiritual',
    description: 'دست‌نوشته‌های شخصی امپراتور فیلسوف رم درباره آرامش درون، فضیلت، تسلیم در برابر سرشت طبیعت و گذرا بودن گیتی.',
    excerpt: `Book II: Morning Reflections on Life and Virtue

When you wake up in the morning, tell yourself: The people I deal with today will be meddling, ungrateful, arrogant, dishonest, jealous, and surly. They are like this because they cannot distinguish good from evil. But I have seen the beauty of good, and the ugliness of evil, and have recognized that the wrongdoer has a nature related to my own — not of the same blood or birth, but the same mind, and possessing a share of the divine.

And so none of them can hurt me. No one can implicate me in ugliness. Nor can I feel angry at my relative, or hate him. We were made to work together like feet, hands, and eyes, like the two rows of the upper and lower teeth. To obstruct each other is unnatural. To feel anger at someone, to turn your back on him: these are obstructions.

Whatever this is that I am, it is a little flesh and breath, and the ruling part. Despise the flesh: blood and bones and a network, a jumble of nerves, veins, and arteries. Consider the breath: wind, always changing, expelled and sucked back again. The third part is the ruling master. Put your books aside; distract yourself no longer; they are not your concern. As if you were already dying, despise the flesh: blood, filth, bones, a network of nerves, veins, arteries. But observe the intellect: you are an old man; do not let it be enslaved any longer, pulled about like a puppet by every selfish impulse.

Remember how long you have been putting this off, how many times you have been given a period of grace by the gods and not used it. It is high time now you realized the nature of the cosmos to which you belong, and of that controlling power whose offspring you are; and that a limit of time is fixed for you, which if you do not use for clearing away your clouds, it will go and you will go, and there will never be another chance.`,
  },
];
