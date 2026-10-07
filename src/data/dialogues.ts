export interface Choice {
  text: string
  reply: string
  nina?: string
  fear?: number
  depression?: number
  social?: number
  fatigue?: number
  fearReason?: string
  depressionReason?: string
  socialReason?: string
  fatigueReason?: string
  resilience?: number
  support?: boolean
  clearEvent?: boolean
}

export interface Approach {
  fear?: number
  social?: number
  depression?: number
  fatigue?: number
  reason: string
}

export interface DialogueDef {
  id: string
  opening: (drink: string) => string
  approach?: Approach
  choices: [Choice, Choice, Choice]
}

export const dialogues: Record<string, DialogueDef> = {
  sonya: {
    id: 'sonya',
    opening: (d) => `Кира, привет. Мне как обычно — ${d}. Ты сегодня как?`,
    choices: [
      {
        text: 'Нормально, спасибо. Сейчас сделаю.',
        reply: 'Хорошо. Я посижу тихо, у окна.',
        social: 2,
        depression: -2,
        socialReason: 'короткий спокойный разговор',
        depressionReason: 'знакомый человек рад тебя видеть',
        resilience: 0.55,
      },
      {
        text: 'Рада тебя видеть, но мне легче без долгого разговора.',
        reply: 'Конечно. Капучино или что ты записала — и я не мешаю.',
        social: 1,
        fear: -1,
        socialReason: 'границу приняли спокойно',
        fearReason: 'разговор остался предсказуемым',
        resilience: 0.45,
      },
      {
        text: 'Если в зале станет тесно, я позову Нину. Заказ приму сама.',
        reply: 'Как скажешь. Я никуда не тороплюсь.',
        nina: 'Я на подхвате. Можешь не тащить смену одна.',
        fear: -2,
        social: 1,
        fearReason: 'помощь рядом, даже если не понадобилась',
        socialReason: 'ты сама обозначила, как тебе удобно',
        resilience: 0.2,
        support: true,
      },
    ],
  },
  igor: {
    id: 'igor',
    opening: (d) => `${d[0]!.toUpperCase()}${d.slice(1)}, пожалуйста, и побыстрее. Через десять минут планёрка.`,
    approach: { social: 3, reason: 'человек торопит' },
    choices: [
      {
        text: 'Повторяю заказ вслух, чтобы не перепутать. Сделаю без лишних вопросов.',
        reply: 'Да, всё верно. Спасибо, что коротко.',
        social: 2,
        fear: 1,
        socialReason: 'разговор получился коротким и ясным',
        fearReason: 'чужая спешка всё равно давит',
        resilience: 0.4,
      },
      {
        text: 'Сделаю быстро, но говорить на бегу не буду.',
        reply: 'Ладно. Мне просто кофе, без беседы.',
        social: 2,
        socialReason: 'ты обозначила темп, он согласился',
        resilience: 0.5,
      },
      {
        text: 'Нина, побудь на очереди. Я готовлю этот заказ.',
        reply: 'Мне всё равно, кто примет следующих. Только не медленно.',
        nina: 'Беру следующих. Ты дыши и наливай.',
        fear: -4,
        social: -2,
        fearReason: 'очередь больше не только на тебе',
        socialReason: 'Нину позвали вовремя',
        support: true,
        clearEvent: true,
      },
    ],
  },
  leonid: {
    id: 'leonid',
    opening: (d) => `${d[0]!.toUpperCase()}${d.slice(1)}.`,
    choices: [
      {
        text: 'Принято. Если сахара не нужно — кивните.',
        reply: 'Угу.',
        social: 2,
        depression: -1,
        socialReason: 'тихий заказ тоже считается разговором',
        depressionReason: 'задача понятная и маленькая',
        resilience: 0.45,
      },
      {
        text: 'Хорошо. Если что-то не так — скажите сразу, я переделаю.',
        reply: 'Скажу.',
        social: 1,
        socialReason: 'правило прозвучало спокойно',
        resilience: 0.35,
      },
      {
        text: 'Нина, глянь, пожалуйста, всё ли спокойно в зале.',
        reply: '…',
        nina: 'Тихий гость, обычный заказ. Зал пустой, кроме него.',
        fear: -3,
        social: 1,
        fearReason: 'Нина подтвердила, что ничего не происходит',
        support: true,
        clearEvent: true,
      },
    ],
  },
  marina: {
    id: 'marina',
    opening: (d) =>
      `Ой, наконец живой человек. Мне ${d}. И можно, я в двух словах, какой сегодня день? Ну, может, не в двух.`,
    approach: { social: 4, fatigue: 1, reason: 'разговор сразу стал плотным' },
    choices: [
      {
        text: 'Заказ приняла. Послушаю, пока греется молоко, но недолго.',
        reply: 'Коротко, честно: день дурацкий, а капучино — нет. Спасибо, что не отмахнулись.',
        social: 4,
        depression: -3,
        fatigue: 2,
        socialReason: 'разговор тёплый, но длинный',
        depressionReason: 'тебя услышали, и ты тоже',
        fatigueReason: 'чужая история забирает силы',
        resilience: 0.55,
      },
      {
        text: 'Я рада вас видеть. Уложитесь в пару фраз: мне нужно готовить.',
        reply: 'Ой. Да. Капучино, день так себе, и я замолкаю. Правда.',
        social: 3,
        depression: -2,
        socialReason: 'граница прозвучала мягко, её приняли',
        depressionReason: 'контакт был, и он не разросся',
        resilience: 0.6,
      },
      {
        text: 'Нина, побудь рядом. Разговор слишком плотный для меня одной.',
        reply: 'Ой, я не хотела давить. Извините.',
        nina: 'Ничего. Заказ я продублирую, а ты можешь отойти на шаг.',
        fear: -3,
        social: -2,
        depression: -1,
        fearReason: 'ты не осталась в разговоре одна',
        socialReason: 'нагрузку разделили',
        depressionReason: 'попросить о помощи получилось',
        support: true,
        resilience: 0.15,
      },
    ],
  },
  pavel: {
    id: 'pavel',
    opening: (d) =>
      `${d[0]!.toUpperCase()}${d.slice(1)}. И чтобы в этот раз нормальный, а не то, что вчера стыдно было пить.`,
    approach: { fear: 5, social: 4, reason: 'посетитель повысил голос' },
    choices: [
      {
        text: 'Принято. Если выйдет не так — переделаю. За вчерашний раз мне жаль.',
        reply: 'Ладно. Давайте просто заново, без лекции.',
        fear: -2,
        social: 2,
        fearReason: 'голос стал тише, когда появился понятный план',
        socialReason: 'разговор остался тяжёлым, но управляемым',
        resilience: 0.45,
      },
      {
        text: 'Я сделаю внимательно. Повышать голос не нужно.',
        reply: '…Хорошо. Просто сделайте нормально.',
        fear: -1,
        social: 2,
        fearReason: 'граница остановила повышение голоса',
        socialReason: 'ты удержала рамку разговора',
        resilience: 0.6,
      },
      {
        text: 'Нина, побудь со мной в этом разговоре.',
        reply: 'Ладно, ладно. Я не кричу.',
        nina: 'Мы сделаем напиток ещё раз. Без крика на стойке.',
        fear: -6,
        social: -3,
        fearReason: 'Нина разделила неприятный разговор',
        socialReason: 'напряжение спало, когда ты не одна',
        support: true,
        clearEvent: true,
        resilience: 0.15,
      },
    ],
  },
  alina: {
    id: 'alina',
    opening: (d) => `Нам ${d}! И можно у вас хоть немного не как в читальном зале?`,
    approach: { social: 6, fear: 2, reason: 'шумная компания' },
    choices: [
      {
        text: 'Один напиток на компанию, музыку не прибавляю: иначе не слышно заказы.',
        reply: 'Ну ладно. Несите, мы потише. Чуть-чуть.',
        social: 3,
        fear: 1,
        socialReason: 'компания всё ещё шумная, но заказ ясен',
        fearReason: 'громкие голоса рядом',
        resilience: 0.35,
      },
      {
        text: 'Говорите тише, пожалуйста. Напиток сейчас сделаю.',
        reply: 'Ой. Да. Извините. Мы можем тише.',
        social: -2,
        fear: -1,
        socialReason: 'они снизили голос',
        fearReason: 'граница сработала',
        resilience: 0.6,
      },
      {
        text: 'Нина, постой со мной. Компания слишком громкая.',
        reply: 'Всё, всё, мы поняли.',
        nina: 'Ребята, тише. Тут кофейня, не клуб. Заказ сейчас будет.',
        fear: -5,
        social: -4,
        fearReason: 'Нина взяла шум на себя',
        socialReason: 'тебе не пришлось перекрикивать зал',
        support: true,
        clearEvent: true,
        resilience: 0.15,
      },
    ],
  },
  renata: {
    id: 'renata',
    opening: (d) => `Вы тоже слышите, как зал дышит, когда пусто? Мне ${d}. Если можно.`,
    approach: { fear: 4, reason: 'странный вопрос про пустой зал' },
    choices: [
      {
        text: 'Это гудит холодильник. Напиток сейчас будет.',
        reply: 'А. Холодильник. Тогда да, просто напиток. Спасибо, что сказали прямо.',
        fear: -5,
        fearReason: 'нашлось обычное объяснение',
        resilience: 0.4,
        clearEvent: true,
      },
      {
        text: 'Напиток я сделаю. Про зал и дыхание говорить не буду.',
        reply: 'Поняла. Извините. Тогда только заказ.',
        fear: -2,
        social: 2,
        fearReason: 'ты обозначила границу и осталась в смене',
        socialReason: 'разговор странный, но закончился быстро',
        resilience: 0.55,
      },
      {
        text: 'Нина, проверь, пожалуйста, что это за звук.',
        reply: 'Хорошо. Я подожду чай. Или что там у меня.',
        nina: 'Компрессор. Я его поправила, теперь тише. Никого в зале нет.',
        fear: -8,
        fearReason: 'Нина проверила звук и зал',
        support: true,
        clearEvent: true,
        resilience: 0.15,
      },
    ],
  },
  gleb: {
    id: 'gleb',
    opening: (d) => `Извините. Можно ${d}. Я сяду в углу и не буду мешать.`,
    approach: { fear: 6, reason: 'он выглядит пугающе' },
    choices: [
      {
        text: 'Конечно. Садитесь, где удобно.',
        reply: 'Спасибо. Я тихо.',
        fear: -8,
        depression: -1,
        fearReason: 'он просто устал и говорит тихо',
        depressionReason: 'страх не подтвердился',
        resilience: 0.55,
      },
      {
        text: 'Напиток сделаю. Пока готовлю, постойте, пожалуйста, чуть дальше от стойки.',
        reply: 'Да. Я у стены. Скажете — подойду.',
        fear: -5,
        social: 1,
        fearReason: 'дистанция, о которой ты попросила, его не разозлила',
        socialReason: 'разговор короткий и ясный',
        resilience: 0.6,
      },
      {
        text: 'Нина, постой рядом. Мне пока не по себе.',
        reply: 'Я могу и уйти, если мешаю. Правда.',
        nina: 'Останься. Это ночной гость, он всегда так сидит. Кира, я рядом.',
        fear: -7,
        social: -2,
        fearReason: 'Нина узнала его и осталась рядом',
        socialReason: 'тебе не пришлось проверять страх в одиночку',
        support: true,
        clearEvent: true,
        resilience: 0.15,
      },
    ],
  },
}
