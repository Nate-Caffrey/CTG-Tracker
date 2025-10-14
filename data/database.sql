CREATE TABLE Resources (
    `id` INTEGER PRIMARY KEY,
    `location` TEXT NOT NULL,
    `group` INTEGER NOT NULL
);


INSERT INTO Resources (`location`, `group`) VALUES ('Technikpult', 0);
INSERT INTO Resources (`location`, `group`) VALUES ('Empore', 0);
INSERT INTO Resources (`location`, `group`) VALUES ('Bibliothek', 0);
INSERT INTO Resources (`location`, `group`) VALUES ('Garderobe', 0);
INSERT INTO Resources (`location`, `group`) VALUES ('Untergeschoss', 0);