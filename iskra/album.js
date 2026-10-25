/* Все идентификаторы вариантов стабильны: порядок вариантов — часть формата сохранения. */
(() => {
'use strict';
const q=(label,options,max=1)=>({label,options:options.split('|'),max});
const m=(phase,title,intro,questions,action,minimum,note='')=>({phase,title,intro,questions,action,minimum,note});
const missions=[
 m('Замысел','Поймай сердце альбома','Начни с ощущения. Два выбора — и у будущего альбома уже есть свой компас.',[
 q('О чём твоя история?','Отпускаю прошлое|Учусь быть собой|Ищу близость|Начинаю заново'),
 q('Какие чувства поведут слушателя?','Нежность|Злость|Надежда|Тоска|Свобода|Спокойствие',2)
 ],'Включи любимый референс. Напой поверх него 20 секунд мелодии с выбранным настроением и сохрани запись на телефоне.','Просто напой один звук с нужным чувством и сохрани его.','Одно слово или рабочее название альбома'),
 m('Замысел','Раскопай сокровища','Сегодня ты охотник за живыми идеями. Идеальное качество записи не требуется.',[
 q('Где ищем первую находку?','Голосовые заметки|Старые демки|Папка с битами|Начну с чистого листа'),
 q('По какому признаку отберёшь идеи?','Хочется подпевать|Есть честная эмоция|Интересный ритм|Сразу вижу историю')
 ],'Послушай пять набросков из выбранного источника и пометь два самых цепляющих. Если начинаешь с нуля — запиши два разных мотива.','Найди или запиши один мотив, к которому хочется вернуться.'),
 m('Замысел','Нарисуй маршрут','Пять песен могут стать одной историей. Выбери её форму и героя первого кадра.',[
 q('Как будет развиваться альбом?','От темноты к свету|От встречи к прощанию|Пять кадров одной ночи|Пять разных состояний'),
 q('С чего начнётся путешествие?','Тихое признание|Резкий разговор|Звук города|Сразу яркий припев')
 ],'Расставь пять демо или идей в выбранную историю. Открой «Студию», если удобно собрать треклист там: существующие треки менять не нужно.','Выбери только первую и последнюю идеи маршрута.','Рабочие названия или одна связка между песнями'),
 m('Песня 1','Зажги первый припев','Твой первый крючок — маленькая фраза, которую хочется повторить.',[
 q('Как зайдёт припев?','С одной длинной ноты|С короткого повтора|С паузы перед фразой|С вопроса и ответа'),
 q('Какое зерно возьмёшь?','Я всё ещё здесь|Давай начнём сначала|Ты слышишь этот свет|Мне хватит тишины')
 ],'Напой выбранную фразу тремя способами. Используй выбранный заход и сохрани тот дубль, который хочется повторить.','Запиши один вариант припева на диктофон.'),
 m('Песня 1','Сними сцену для куплета','Куплет — это кино. Выбери место и деталь, чтобы чувства стали видимыми.',[
 q('Где происходит сцена?','Кухня после полуночи|Пустая остановка|Поезд на рассвете|Комната после гостей'),
 q('Какая деталь расскажет больше слов?','Остывшая чашка|Мигающий экран|Забытый шарф|Шум за стеной')
 ],'Произнеси под ритм четыре строки о выбранной сцене. В последней строке поверни историю к припеву первого трека.','Запиши голосом две строки с выбранной деталью.','Одна строчка, которую хочется оставить'),
 m('Песня 1','Собери демо без страха','Песня должна случиться целиком. Сегодня побеждает завершённый черновик.',[
 q('Какую форму попробуешь?','Куплет → припев → куплет → припев|Припев → куплет → припев|Куплет → припев → бридж → припев|Одна история с повтором в финале'),
 q('На чём построишь демо?','Голос и гитара|Голос и клавиши|Готовый бит|Голос и простой пульс')
 ],'Собери первую песню в выбранной форме на выбранной основе. Сделай черновой экспорт или сквозную запись; полировку оставь на потом.','Запиши куплет и припев подряд одним дублем.'),
 m('Песня 2','Смени температуру','Второй трек добавляет контраст. Пусть он покажет тебя с другой стороны.',[
 q('Чем он отличается от первого?','Теплее и ближе|Холоднее и дальше|Резче и громче|Легче и игривее'),
 q('Какой ритм у нового крючка?','Ровные короткие фразы|Синкопы и паузы|Протяжная мелодия|Почти разговор')
 ],'Включи другую гармонию или бит и напой припев в выбранном ритме. Сравни с первым треком: контраст должен быть слышен.','Сохрани 15 секунд нового припева.'),
 m('Песня 2','Поменяй точку зрения','История оживает, когда у неё появляется конкретный голос.',[
 q('Кто рассказывает эту песню?','Я сегодняшний|Я из прошлого|Человек, который ушёл|Случайный наблюдатель'),
 q('Что герой решается сделать?','Позвонить первым|Наконец уйти|Попросить прощения|Остаться рядом')
 ],'Проговори куплет от лица выбранного героя. Пусть его решение случится перед припевом; запиши черновик голосом.','Запиши две фразы: что герой видит и на что решается.','Самая честная реплика героя'),
 m('Песня 2','Сделай второй черновик','Две песни — уже диалог. Сохрани вторую, пока её энергия живая.',[
 q('Что станет опорой демо?','Басовый рисунок|Аккордовый пульс|Барабанный грув|Голос без лишних слоёв'),
 q('Как закончится трек?','Резкий обрыв|Последняя фраза без музыки|Повтор с новым смыслом|Короткое инструментальное эхо')
 ],'Запиши вторую песню целиком с выбранной опорой и финалом. Сохрани отдельную демо-версию, не затирая исходники.','Сделай сквозную запись куплета, припева и окончания.'),
 m('Песня 3','Поймай третий крючок','Представь, что у слушателя осталось десять секунд. Чем ты его зацепишь?',[
 q('Какой сюрприз в припеве?','Внезапная тишина|Прыжок мелодии вверх|Шёпот вместо крика|Ответ второго голоса'),
 q('Где появится сюрприз?','На первой фразе|Перед главным словом|Во второй половине|В последнем повторе')
 ],'Напой обычный припев, затем вариант с выбранным сюрпризом в выбранном месте. Сохрани более цепкую версию.','Запиши один короткий крючок с сюрпризом.'),
 m('Песня 3','Расскажи через образ','Сегодня вместо объяснений — картинка. Выбери символ и дай ему движение.',[
 q('Какой образ держит песню?','Город под водой|Свет в пустом окне|Трещина во льду|Карман с чужими ключами'),
 q('Что с ним происходит к финалу?','Он исчезает|Он становится ближе|Он меняет значение|Он остаётся, но герой уходит')
 ],'Запиши голосом куплет, в котором выбранный образ меняется к финалу. Убери хотя бы одну фразу, объясняющую чувства напрямую.','Придумай начало и конец истории образа, запиши обе фразы.','Строка с главным образом'),
 m('Песня 3','Собери середину истории','Третий трек — центр тяжести. Проверь, как он дышит между первыми двумя.',[
 q('Какой будет энергия?','Нарастает к финалу|Волна: тише → громче → тише|Напор с первой секунды|Интимно от начала до конца'),
 q('Чем свяжешь части?','Короткий сбивочный ритм|Пауза на вдох|Повтор слова|Один узнаваемый звук')
 ],'Собери третье демо с выбранной динамикой и переходом. Прослушай начало всех трёх песен подряд и сохрани третью версию.','Запиши две части третьей песни с выбранным переходом.'),
 m('Песня 4','Выйди из привычной роли','Разреши себе один неожиданный ход. Необычная подача может открыть новую песню.',[
 q('Какую роль примеришь?','Спокойный рассказчик|Дерзкий собеседник|Очень близкий шёпот|Голос издалека'),
 q('Как изменишь привычный звук?','Уберу ударные|Ускорю пульс|Оставлю один инструмент|Добавлю странный фоновый звук')
 ],'Запиши припев четвёртой песни в выбранной роли с выбранным ограничением. Сравни с привычной подачей и оставь более живую.','Сделай один непривычный дубль на 20 секунд.'),
 m('Песня 4','Доведи эксперимент до демо','Дай необычной идее ясную форму. Эксперименту тоже нужен финал.',[
 q('Что сохранит цельность?','Одна повторяющаяся фраза|Один ритмический рисунок|Один звук через весь трек|Одна короткая мелодия'),
 q('Какая деталь удивит в конце?','Другой последний аккорд|Пауза вместо припева|Голос без обработки|Возвращение звука из начала')
 ],'Собери четвёртую песню вокруг выбранного якоря. Добавь выбранную финальную деталь и сохрани сквозной черновик.','Запиши первую и последнюю части, соединив их одним якорем.'),
 m('Песня 5','Выбери послевкусие','Последняя песня — чувство, с которым слушатель закроет альбом.',[
 q('Что останется после финала?','Мне стало легче|Я не один|Можно начать снова|Я принимаю неизвестность'),
 q('Как попрощаешься со слушателем?','Тихо и близко|С большим светлым припевом|Открытым вопросом|Без слов, одной мелодией')
 ],'Напой финальный припев так, чтобы в нём слышалось выбранное послевкусие. Сохрани две подачи и выбери одну.','Запиши последнюю фразу или мелодию альбома.','Фраза, с которой слушатель уйдёт'),
 m('Песня 5','Замкни круг','Пять черновиков — уже мир. Свяжи финал с началом, не повторяя его буквально.',[
 q('Что отзовётся из первой песни?','Тот же звук|Похожая фраза|Мелодия в другом настроении|Тишина на том же месте'),
 q('Что изменилось у героя?','Научился отпускать|Перестал прятаться|Решился на встречу|Принял свой путь')
 ],'Собери пятое демо и вплети отсылку к первой песне. В финале покажи выбранную перемену героя и сохрани запись.','Запиши финальный припев с одной отсылкой к началу.'),
 m('Запас и глубина','Прокачай слабое звено','Сегодня не нужно чинить всё. Одно точное улучшение сильнее десяти сомнений.',[
 q('Какой трек просит внимания?','Песня 1|Песня 2|Песня 3|Песня 4|Песня 5|Все крепкие — бонусная идея'),
 q('Куда направишь усилие?','Слабый припев|Безликий куплет|Затянутое начало|Предсказуемый финал')
 ],'Открой выбранную песню и сделай альтернативу выбранному фрагменту. Сохрани «до» и «после». Если все пять крепкие — запиши бонусный фрагмент.','Измени только одну фразу, ноту или паузу.','Что стало сильнее после правки'),
 m('Отбор','Устрой первое прослушивание','Надень наушники слушателя. Сегодня важно заметить ощущение, а не открыть плагины.',[
 q('Как послушаешь демки?','На прогулке|В наушниках с закрытыми глазами|Через колонку дома|На телефоне без отвлечений'),
 q('На что обратишь внимание?','Где хочется переключить|Где хочется подпеть|Где теряется история|Где песни слишком похожи',2)
 ],'Прослушай пять демо подряд в выбранной обстановке. В избранных точках поставь метки времени в плеере или заметках, не исправляй на ходу.','Послушай две песни подряд и отметь один сильный и один слабый момент.'),
 m('Редактура','Сделай припев незабываемым','Припев должен остаться после выключения музыки. Проверь это простым экспериментом.',[
 q('Какой приём попробуешь?','Укорочу главную фразу|Повторю ключевое слово|Упрощу мелодию|Сделаю паузу перед крючком'),
 q('Как проверишь результат?','Напою без минуса|Вспомню через 10 минут|Дам послушать другу|Сравню два варианта подряд')
 ],'Переделай один припев выбранным способом и проверь его выбранным тестом. Сохрани обе версии, чтобы решение можно было пересмотреть.','Запиши два варианта главной фразы и выбери цепкий.','Главная фраза новой версии'),
 m('Редактура','Закрой незавершённые места','Никаких новых вселенных. Только один незакрытый участок, который мешает слушать целиком.',[
 q('Какую дыру закрываешь?','Не хватает куплета|Нет перехода|Нет окончания|Есть пустые слова-заглушки'),
 q('Какой подход возьмёшь?','Самый простой рабочий вариант|Повтор с небольшой переменой|Пауза вместо лишнего|Вернусь к раннему наброску')
 ],'Пройди все пять демо и закрой выбранный тип пробела выбранным способом. Экспортируй обновлённые версии в отдельную папку.','Закрой один пробел в одном треке и сохрани версию.'),
 m('Вокал','Запиши голос близко','Песни 1 и 2 ждут живого голоса. Подготовь пространство и выбери подачу.',[
 q('Какой характер у лидов?','Разговор на ухо|Сдержанная сила|Хрупкость без защиты|Уверенное признание'),
 q('Как организуешь запись?','Три полных дубля|По куплету и припеву|Один разогрев и два дубля|Короткие фрагменты с отдыхом')
 ],'Разогрей голос комфортно, проверь уровень без перегруза и запиши лиды песен 1 и 2 выбранным способом. Сохрани исходные дубли.','Запиши один куплет первой песни без напряжения.'),
 m('Вокал','Добавь голосу контраст','Песни 3 и 4 не обязаны звучать одинаково. Выбери различие, которое слышно без эффектов.',[
 q('Как разведёшь подачу?','Третья мягче, четвёртая резче|Третья ближе, четвёртая дальше|Третья ровнее, четвёртая свободнее|Сохраню общий тон, изменю акценты'),
 q('Что важнее в этих дублях?','Разборчивые слова|Дыхание фразы|Эмоция на главном слове|Естественные паузы',2)
 ],'Запиши основные партии песен 3 и 4, удерживая выбранный контраст. Сравни припевы без обработки и сохрани удачные дубли.','Запиши по одному припеву с разной подачей.'),
 m('Вокал','Оставь последний честный дубль','Финальная песня просит не идеальности, а присутствия. Представь одного слушателя.',[
 q('Кому поёшь пятую песню?','Себе в прошлом|Близкому человеку|Тому, кто сейчас один|Себе в будущем'),
 q('Что оставишь живым?','Слышимый вдох|Лёгкую дрожь|Тихое окончание фразы|Неровный, но честный акцент')
 ],'Запиши лид пятой песни, обращаясь к выбранному слушателю. Сохрани естественную деталь, если она помогает истории и голосу комфортно.','Запиши один полный припев с нужным ощущением.','Кому и что хочется сказать в финале'),
 m('Вокал','Расставь вокальные искры','Бэки нужны там, где они усиливают смысл. Выбери максимум два приёма.',[
 q('Какие слои добавишь?','Дабл главной фразы|Верхняя гармония|Тихий ответ|Один адлиб',2),
 q('Где они нужнее?','Только финальный припев|Последнее слово строки|Паузы между фразами|Переход к финалу')
 ],'Запиши выбранные слои только в выбранных местах. Сравни с версией без них и отключи всё, что отвлекает от основного голоса.','Оставь один точный бэк на главной фразе.'),
 m('Редактирование','Собери живой лид','Лучший дубль — тот, которому веришь. Выбери ориентир и безопасную границу редактирования.',[
 q('По чему выберешь фразы?','Честная эмоция|Ясные слова|Уверенная мелодия|Единый характер'),
 q('Что исправишь в первую очередь?','Явный промах по ноте|Сбитое начало фразы|Щелчок на склейке|Слишком громкий вдох')
 ],'Собери лиды из сохранённых дублей по выбранному ориентиру. Исправь заметную проблему, проверь склейки в соло и в музыке.','Собери один припев и прослушай все его склейки.'),
 m('Аранжировка','Освободи место истории','Самый сильный ход иногда — убрать звук. Устрой музыке короткую уборку.',[
 q('Что мешает голосу?','Плотные клавиши|Слишком много гитар|Яркие верхние звуки|Непрерывные барабаны'),
 q('Как создашь движение?','Уберу слой в куплете|Оставлю паузу перед припевом|Добавлю слой только в финале|Сокращу вступление')
 ],'В одном треке отключи выбранный мешающий слой и попробуй выбранное движение. Сравни версии на одинаковой громкости и сохрани лучшую.','Убери один слой в одном фрагменте и сравни результат.','Какое пространство появилось в песне'),
 m('Сведение','Найди опору для первых двух','Начни с баланса. На тихой громкости быстро слышно, кто мешает истории.',[
 q('Что слушаешь первым?','Понятен ли голос|Дружат ли бас и бочка|Не режет ли верх|Есть ли глубина'),
 q('Как проверишь баланс?','Тихая громкость|Моно|Наушники и колонка|Референс на похожей громкости')
 ],'Сделай рабочий баланс песен 1 и 2 с выбранным приоритетом, затем проведи выбранную проверку. Экспортируй версии для прослушивания.','Доведи баланс одного припева до понятного голоса.'),
 m('Сведение','Собери единый звуковой мир','Остальные песни могут быть разными, но альбом должен ощущаться цельным.',[
 q('Что объединит песни 3–5?','Близость голоса|Характер пространства|Плотность низа|Мягкость верхних частот'),
 q('С чем будешь сравнивать?','С первой песней|Со второй песней|С любимым референсом|Со всем альбомом по кругу')
 ],'Сведи песни 3–5, сравнивая выбранное свойство с выбранной опорой на похожей громкости. Сохрани отдельные версии миксов.','Согласуй один трек с опорой по выбранному свойству.'),
 m('Проверка','Стань обычным слушателем','Оставь студийные привычки за дверью. Пора проверить альбом там, где он будет жить.',[
 q('На каких устройствах проверишь?','Наушники|Динамик телефона|Домашняя колонка|Автомобильная система',2),
 q('Что пойдёт в финальную правку?','Голос теряется|Низ перегружен|Резкие звуки утомляют|Паузы и порядок|Всё звучит цельно')
 ],'Прослушай альбом на выбранных устройствах. Исправь главную замеченную проблему; если всё цельно — зафиксируй версии и порядок.','Проверь одну песню на динамике телефона и в наушниках.','Одна финальная правка или вывод прослушивания'),
 m('Финиш','Сохрани свой первый альбом','Тридцать шагов позади. Упакуй результат так, чтобы к нему можно было вернуться.',[
 q('Что проверено перед финишем?','Финальные аудиофайлы|Порядок и названия|Обложка и данные релиза|Резервная копия',4),
 q('Какой следующий шаг выберешь?','Закрытое прослушивание|Отправка дистрибьютору|Ещё один круг правок|Отпраздновать и отдохнуть')
 ],'Сложи финальные файлы и данные релиза в одну папку, проверь экспорт без обрезанного начала и конца, сделай копию в другом месте. Подготовь выбранный следующий шаг.','Собери текущие версии, сохрани копию и список того, что осталось.','Название готового альбома или что ты заберёшь из этих 30 дней')
];
const resultOptions=[['full','Сделано — результат сохранён'],['minimum','Сделал минимум — это тоже шаг'],['later','Вернусь к действию позже']];
const storageKey=giftMode?'iskra-gift-album30-v1':'iskra-album30-v1';
const emptyAnswer=()=>({picks:[[],[]],result:'',note:''});
const blank=()=>({day:0,done:Array(30).fill(false),mode:'inspire',answers:Array.from({length:30},emptyAnswer)});
let state=blank(),blocked=false,persistentError='';
const $=s=>document.querySelector(s);
function validAnswer(a,i){
 return a&&Array.isArray(a.picks)&&a.picks.length===2&&a.picks.every((p,k)=>Array.isArray(p)&&p.length<=missions[i].questions[k].max&&new Set(p).size===p.length&&p.every(n=>Number.isInteger(n)&&n>=0&&n<missions[i].questions[k].options.length))&&['','full','minimum','later'].includes(a.result)&&typeof a.note==='string'&&a.note.length<=500;
}
function validState(s){return s&&Number.isInteger(s.day)&&s.day>=0&&s.day<30&&Array.isArray(s.done)&&s.done.length===30&&s.done.every(v=>typeof v==='boolean')&&(!('answers' in s)||(Array.isArray(s.answers)&&s.answers.length===30&&s.answers.every(validAnswer)));}
try{
 const raw=localStorage.getItem(storageKey);
 if(raw!==null){const saved=JSON.parse(raw);if(!validState(saved))throw Error('format');state={...saved,answers:saved.answers||blank().answers};}
}catch(error){
 blocked=true;persistentError='Не удалось прочитать сохранение. Прежние данные не перезаписаны. Проверь доступ к хранилищу или импортируй резервную копию миссий.';
}
function save(){
 const node=$('#album-save-status');
 if(blocked){node.dataset.error='true';node.textContent=persistentError;return false;}
 try{localStorage.setItem(storageKey,JSON.stringify({...state,missionsVersion:1}));node.dataset.error='false';node.textContent='Ответы и прогресс сохранены на этом устройстве.';return true;}
 catch{node.dataset.error='true';node.textContent='Не удалось сохранить изменения. Экспортируй миссии, чтобы не потерять ответы; затем проверь свободное место и доступ к хранилищу.';return false;}
}
function ready(i){const a=state.answers[i];return a.picks.every(p=>p.length>0)&&['full','minimum'].includes(a.result);}
function announce(text,error=false){$('#album-status').textContent=text;$('#album-status').dataset.error=String(error);}
function updateProgress(){
 const count=state.done.filter(Boolean).length;
 $('#album-progress-text').textContent=count+' / 30';
 $('#album-progress-fill').style.width=(count/30*100)+'%';
 $('.album-meter').setAttribute('aria-valuenow',String(count));
 const answer=state.answers[state.day],started=answer.picks.some(p=>p.length)||answer.result||answer.note;
 const badge=$('#album-day-state');badge.textContent=state.done[state.day]?'Выполнен ✓':started?'В процессе':'Не выполнен';badge.dataset.state=state.done[state.day]?'done':started?'started':'new';
 const button=$('#album-done');button.textContent=state.done[state.day]?'отменить отметку':'завершить миссию ✓';
 // Кнопка доступна: при неполных ответах объясняет, что осталось сделать.
 button.setAttribute('aria-describedby','album-status');
 $('#album-prev').disabled=state.day===0;$('#album-next').disabled=state.day===29;
}
function receipt(){
 const answer=state.answers[state.day],mission=missions[state.day];
 const selected=answer.picks.map((p,i)=>p.map(n=>mission.questions[i].options[n]).join(' + ')).filter(Boolean);
 const node=$('#mission-receipt');node.replaceChildren(el('strong','',state.done[state.day]?'Миссия завершена. ':'Твой маршрут: '),document.createTextNode(selected.length?selected.join(' · '):'выбери варианты выше — здесь появится твой план.'));
 if(state.done[state.day]&&!ready(state.day))node.append(document.createTextNode(' Прежняя отметка сохранена; новые вопросы можно заполнить в любой момент.'));
}
function changed(cleared=false){
 if(state.done[state.day]&&(state.answers[state.day].result==='later'||(cleared&&!ready(state.day))))state.done[state.day]=false;
 const saved=save();updateProgress();receipt();window.dispatchEvent(new Event('iskra:album-change'));
 announce(saved?(ready(state.day)?'Всё готово — можешь завершить миссию.':'Выбор сохранён. Продолжай в своём темпе.'):'Изменения пока только на экране. Сохрани резервную копию через экспорт.',!saved);
}
function optionGroup(legend,options,selected,multiple,onChange,name){
 const field=el('fieldset','mission-step'),title=el('legend','',legend);field.append(title);
 let current=selected.filter(value=>options.some(([v])=>v===value));
 const hint=multiple>1?el('p','mission-step-hint'):null;
 if(hint)field.append(hint);
 const choices=el('div','mission-options');
 const reset=el('button','mission-reset','Сбросить выбор');reset.type='button';reset.setAttribute('aria-label','Сбросить выбор: '+legend);
 function sync(){reset.disabled=current.length===0;if(hint)hint.textContent='До '+multiple+' вариантов · выбрано '+current.length;}
 options.forEach(([value,label])=>{
  const wrap=el('label','mission-option'),input=el('input');input.type=multiple>1?'checkbox':'radio';input.name=name;input.value=String(value);input.checked=current.includes(value);
  input.addEventListener('change',()=>{
   if(multiple>1&&input.checked&&current.length>=multiple){input.checked=false;announce('Можно выбрать не больше '+multiple+' вариантов. Сначала сними один из выбранных.',true);return;}
   current=multiple>1?(input.checked?[...current,value]:current.filter(v=>v!==value)):[value];
   onChange(value,input.checked,false);sync();
  });wrap.append(input,el('span','',label));choices.append(wrap);
 });
 reset.addEventListener('click',()=>{current=[];choices.querySelectorAll('input').forEach(input=>{input.checked=false;});onChange(null,false,true);sync();choices.querySelector('input').focus({preventScroll:true});});
 field.append(choices,reset);sync();return field;
}
function render(){
 const i=state.day,mission=missions[i],answer=state.answers[i];
 $('#album-phase').textContent=mission.phase;$('#album-duration').textContent=i<20?'10–25 минут':'20–40 минут';
 $('#album-day').textContent=String(i+1).padStart(2,'0');$('#album-title').textContent=mission.title;$('#album-detail').textContent=mission.intro;
 const form=$('#album-mission');form.replaceChildren();
 mission.questions.forEach((question,k)=>{
  const selected=answer.picks[k];
  form.append(optionGroup((k+1)+'. '+question.label,question.options.map((label,n)=>[n,label]),selected,question.max,(value,checked,reset)=>{
   if(reset)selected.splice(0);
   else if(question.max===1)selected.splice(0,selected.length,value);
   else if(checked)selected.push(value);else selected.splice(selected.indexOf(value),1);
   changed(reset||!checked);
  },'mission-'+i+'-'+k));
 });
 const guide=IskraPractice.days[i],action=el('div','mission-action');action.append(el('h3','','✳ '+guide.focus));
 const intro=el('p','',guide.why);action.append(intro);
 const steps=el('ol','practice-steps');guide.steps.forEach(step=>steps.append(el('li','',step)));action.append(steps);
 const output=el('p','practice-output');output.append(el('strong','','На выходе: '),document.createTextNode(guide.output));action.append(output);
 const review=el('p','practice-review');review.append(el('strong','','Как проверить: '),document.createTextNode(guide.review));action.append(review);
 const min=el('p','album-min');min.append(el('strong','','Если мало сил: '),document.createTextNode(mission.minimum));action.append(min);form.append(action);
 const result=optionGroup('3. Как прошла миссия?',resultOptions,[answer.result],1,(value,checked)=>{answer.result=checked?value:'';changed(!checked)},'mission-result');result.classList.add('mission-result');form.append(result);
 if(mission.note){
  const details=el('details','mission-note');details.open=Boolean(answer.note);details.append(el('summary','','+ Своя заметка · необязательно'));
  const id='mission-note-'+i,label=el('label','',mission.note),input=el('textarea','studio-textarea');label.htmlFor=id;input.id=id;input.maxLength=500;input.placeholder='Пара слов, если хочется…';input.value=answer.note;
  input.addEventListener('input',()=>{answer.note=input.value;changed()});details.append(label,input);form.append(details);
 }
 const transfer=el('button','studio-quiet mission-transfer','В студию с этим заданием →');transfer.type='button';transfer.addEventListener('click',()=>{
 const chosen=answer.picks.map((p,k)=>p.map(n=>mission.questions[k].options[n]).join(' + ')).filter(Boolean).join(' · ');
 IskraStudio.receive({day:i,title:mission.title,task:(chosen?'Выбор: '+chosen+'. ':'')+guide.steps.join(' '),output:guide.output,review:guide.review});switchMode('studio');document.querySelector('#studio-assignment').scrollIntoView({block:'start',behavior:'instant'});document.querySelector('#assignment-track').focus({preventScroll:true});
 });form.append(transfer);
 form.append(el('p','mission-receipt'));form.lastElementChild.id='mission-receipt';
 updateProgress();receipt();
 announce(state.done[i]?(state.done.every(Boolean)?'Все 30 миссий завершены. Сохрани экспорт — твой путь стоит беречь.':'Этот день уже завершён. Ответы можно пересмотреть.'):'Выбери направление, сделай действие и отметь результат.');
 if(blocked){$('#album-save-status').textContent=persistentError;$('#album-save-status').dataset.error='true';}
}
function go(i){state.day=Math.max(0,Math.min(29,i));render();save();$('#album-title').focus({preventScroll:true});$('#album-card').scrollIntoView({block:'start',behavior:'instant'});}
function switchMode(mode){
 state.mode=['album','studio'].includes(mode)?mode:'inspire';
 const url=new URL(location.href);if(url.searchParams.has('mode')||state.mode!=='inspire')url.searchParams.set('mode',state.mode);history.replaceState(null,'',url);
 ['album','studio','inspire'].forEach(name=>{$('#'+name+'-view').hidden=state.mode!==name;$('#mode-'+name).setAttribute('aria-selected',String(state.mode===name));});
 if(state.mode==='album')render();save();window.dispatchEvent(new Event('iskra:album-change'));
}
['album','studio','inspire'].forEach(mode=>$('#mode-'+mode).addEventListener('click',()=>switchMode(mode)));
$('#album-prev').addEventListener('click',()=>go(state.day-1));$('#album-next').addEventListener('click',()=>go(state.day+1));
$('#album-done').addEventListener('click',()=>{
 if(state.done[state.day]){state.done[state.day]=false;const saved=save();updateProgress();receipt();announce(saved?'Отметка снята. Все ответы сохранены.':'Изменение отметки не сохранено. Экспортируй миссии.',!saved);return;}
 if(!ready(state.day)){
  const missing=state.answers[state.day].picks.findIndex(p=>p.length===0);
  announce(missing>=0?'Сначала ответь на вопрос '+(missing+1)+'.':'Выполни действие или его облегчённый вариант, затем выбери результат «Сделано» или «Сделал минимум».',true);
  const target=missing>=0?$('#album-mission').querySelectorAll('fieldset')[missing]:$('.mission-result');target.querySelector('input').focus();return;
 }
 const completedDay=state.day;state.done[completedDay]=true;
 if(completedDay<29)state.day=completedDay+1;
 const saved=save();if(!saved)state.day=completedDay;
 render();window.dispatchEvent(new Event('iskra:album-change'));
 announce(saved?(state.done.every(Boolean)?'30 из 30! Сохрани резервную копию — твой путь стоит беречь.':'День '+(completedDay+1)+' выполнен ✓ '+(state.day>completedDay?'Следующий день уже открыт.':'К другим дням можно вернуться стрелками.')):'Отметка пока не сохранена. Экспортируй миссии, чтобы сохранить прогресс.',!saved);
 if(saved&&state.day!==completedDay){$('#album-title').focus({preventScroll:true});$('#album-card').scrollIntoView({block:'start',behavior:'instant'});}

});
$('#album-export').addEventListener('click',()=>{
 const blob=new Blob([JSON.stringify({app:'iskra-missions',version:1,exportedAt:new Date().toISOString(),album:state},null,2)],{type:'application/json'}),url=URL.createObjectURL(blob),a=el('a');a.href=url;a.download='iskra-missions-'+(giftMode?'gift-':'')+new Date().toISOString().slice(0,10)+'.json';document.body.append(a);a.click();a.remove();setTimeout(()=>URL.revokeObjectURL(url),3000);
});
$('#album-import').addEventListener('click',()=>$('#album-file').click());
$('#album-file').addEventListener('change',async event=>{
 const file=event.target.files?.[0];if(!file)return;
 try{
  if(file.size>1000000)throw Error('Файл слишком большой');const data=JSON.parse(await file.text());
  if(data.app!=='iskra-missions'||data.version!==1||!validState(data.album))throw Error('Неверный формат копии миссий');
  if(!confirm('Заменить ответы и отметки 30 дней из резервной копии? Треки в Студии останутся без изменений.'))return;
  const imported=data.album;state={day:imported.day,done:[...imported.done],mode:'album',answers:imported.answers||blank().answers};blocked=false;persistentError='';switchMode('album');
 }catch(error){announce('Не удалось импортировать: '+error.message,true);}finally{event.target.value='';}
});
const requested=new URLSearchParams(location.search).get('mode');if(['album','studio'].includes(requested))state.mode=requested;
window.IskraAlbum={snapshot:()=>JSON.parse(JSON.stringify(state)),validate:validState,key:storageKey,compass:()=>{const a=state.answers[0];return a.picks.map((p,k)=>p.map(n=>missions[0].questions[k].options[n]).join(' + ')).filter(Boolean).join(' · ');},open:switchMode};
render();switchMode(state.mode);
})();
