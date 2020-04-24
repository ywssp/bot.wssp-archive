const { Command } = require('discord-akairo');
const suggestionTable = require('../suggestionTable.js');
const {
  suggestionDatabase: databaseChannel,
  suggestionToDo: toDoChannel,
  suggestionUpdates: updateChannel,
} = require('../logChannels.js');
const createEmbed = require('../embedCreator.js');
const { v4: makeUuid } = require('uuid');

class ActivityCommand extends Command {
  constructor() {
    super('suggest', {
      aliases: ['suggest'],
      category: 'Utilities',
    });
  }

  //determine the arguments that will be used using the flag
  *args() {
    let suggestion, uuid, doability, use, description;
    const flag = yield { type: 'string' };
    if (flag === '--add') {
      suggestion = yield { match: 'rest' };
    } else if (flag === '--claim') {
      uuid = yield { type: 'string' };
      doability = yield { type: 'string' };
      use = yield { type: 'integer' };
    } else if (flag === '--finish') {
      uuid = yield { type: 'string' };
      description = yield { match: 'rest' };
    } else if (flag === '--remove') {
      uuid = yield { type: 'string' };
      description = yield { match: 'rest' };
    } else if (flag === '--status') {
      uuid = yield { type: 'string' };
    }
    return { flag, suggestion, uuid, doability, use, description };
  }

  async exec(message, args) {
    //all free-to-use commands
    if (args.flag === '--add') {
      //seperate the name and description and put it on an array
      const suggestion = args.suggestion.split(/ *\| */, 2);
      try {
        //make a UUID for the suggestion
        const uuid = makeUuid();
        //create a row on the database for the suggestion
        await suggestionTable.create({
          uuid: uuid,
          name: suggestion[0],
          description: suggestion[1],
          user_id: message.author.id,
          doability: 'Not yet claimed',
          status: 'Not yet claimed',
        });
        //notify the author that the suggestion is submitted
        message.author.send(
          createEmbed({
            message: message,
            color: '#1565C0',
            title: 'Done!',
            description: `The suggestion has been sent to the database, and to ywssp.\nYou\'ll also need this UUID:\`\`\`${uuid}\`\`\``,
            footer:
              'You can do `y+suggest --status [uuid]` to check your suggestion! You could also do `y+suggest --remove [uuid]` to remove your suggestion',
            authorBool: true,
            footerBool: true,
          })
        );
        //delete original message
        message.delete();
        //send an embed on #suggestion-database
        const databaseEmbed = await this.client.channels.cache
          .get(databaseChannel)
          .send(
            createEmbed({
              message: message,
              fields: [
                { name: 'Name', value: suggestion[0] },
                { name: 'Description', value: suggestion[1] },
                { name: 'UUID', value: uuid },
                { name: 'Status', value: 'Not yet claimed' },
                { name: 'Doability', value: 'Not yet claimed' },
              ],
            })
          );
        //put the id of the embed on #suggestion-database and put it in the suggestion row
        await suggestionTable.update(
          { suggestion_id: databaseEmbed.id },
          { where: { uuid: uuid } }
        );
      } catch (e) {
        const errorEmbed = createEmbed({
          message: message,
          color: '#F44336',
          title: 'Whoops!',
          description:
            "Something went wrong, but i don't know what went wrong. Just contact ywssp and he will fix it (Probably)",
          authorBool: true,
        });
        console.error(e);
        //if the suggestion name/description is already taken
        if (e.name === 'SequelizeUniqueConstraintError') {
          errorEmbed.setDescription(
            'Your suggestions name/description is already used!'
          );
          return message.channel.send(errorEmbed);
        }
        return message.channel.send(errorEmbed);
      }
    } else if (args.flag === '--status') {
      //get the suggestion row using the given uuid
      const suggestion = await suggestionTable.findOne({
        where: { uuid: args.uuid },
      });
      //delete the message
      message.delete();
      //if a suggestion is found, then send the status of the suggestion
      if (suggestion) {
        return message.author.send(
          createEmbed({
            message: message,
            title: '#1565C0',
            fields: [
              { name: 'Name', value: suggestion.get('name') },
              { name: 'Description', value: suggestion.get('description') },
              { name: 'UUID', value: suggestion.get('uuid') },
              { name: 'Status', value: suggestion.get('status') },
              { name: 'Doability', value: suggestion.get('doability') },
            ],
            authorBool: true,
          })
        );
      }
      //if the suggestion is not found, then notify the author
      //send the suggestion status to the authors dms
      return message.author.send(
        createEmbed({
          message: message,
          color: '#F44336',
          title: 'Whoops!',
          description:
            "The suggestion could not be found. It's probably:\nA. A typo,\nB. The suggestion is already finished,\nC. The suggstion is removed, or\nD. The suggestion didn't exist at all.",
          authorBool: true,
        })
      );
    } else if (
      args.flag === '--cancel' &&
      message.author.id !== process.env.YWSSP
    ) {
      const suggestion = await suggestionTable.findOne({
        where: { uuid: args.uuid },
      });
      this.client.users.cache.get(suggestion.get('user_id')).send(
        createEmbed({
          message: message,
          color: '#F44336',
          title: '._.',
          description:
            'Your suggestion has been removed. IDK why you want to do it but i did it.',
          authorbool: true,
        })
      );
      const suggestionMessage = await this.client.channels.cache
        .get(databaseChannel)
        .messages.fetch(suggestion.get('suggestion_id'));
      suggestionMessage.delete();
      const todoMessage = await this.client.channels.cache
        .get(toDoChannel)
        .messages.fetch(suggestion.get('todolist_id'));
      if (todoMessage) {
        todoMessage.delete();
      }
      await suggestionTable.destroy({ where: { uuid: args.uuid } });
    }
    //after checking if the flag is --add or --status, check if the command user is ywssp
    else if (message.author.id !== process.env.YWSSP) {
      message.author.send('No.');
      message.delete();
    } else if (args.flag === '--claim') {
      //update the suggestion row
      await suggestionTable.update(
        [{ doability: args.doability },
        { status: 'Claimed' }],
        { where: { uuid: args.uuid } }
      );
      //get the suggestion row for reference
      const suggestion = await suggestionTable.findOne({
        where: { uuid: args.uuid },
      });
      //get the thumbnail for the suggestion
      const thumbnails = {
        Sure: [
          'https://cdn.discordapp.com/attachments/635809136659005456/698383628358385684/sure.png',
          '#1A5276',
        ],
        Plausible: [
          'https://cdn.discordapp.com/attachments/635809136659005456/698383967493029888/plausible.png',
          '#9C640C',
        ],
        Unsure: [
          'https://cdn.discordapp.com/attachments/635809136659005456/698384038490013776/unsure.png',
          '#7B241C',
        ],
      };
      //send a congratulatory embed to the suggestion creator
      this.client.users.cache.get(suggestion.get('user_id')).send(
        createEmbed({
          message: message,
          color: '#1565C0',
          title: 'Nice!',
          description:
            'Your suggestion has been claimed! You can see your suggestion on #to-do-list.',
          authorBool: true,
        })
      );
      //send the suggestion on #to-do-list
      const todoEmbed = await this.client.channels.cache.get(toDoChannel).send(
        createEmbed({
          message: message,
          color: thumbnails[args.doability][1],
          thumbnail: thumbnails[args.doability][0],
          fields: [
            { name: 'Name', value: suggestion.get('name') },
            { name: 'Description', value: suggestion.get('description') },
          ]
        })
      );
      todoEmbed.react('✅');
      //get the embed on #suggestion-database
      const suggestionMessage = await this.client.channels.cache
        .get(databaseChannel)
        .messages.fetch(suggestion.get('suggestion_id'));
      //edit the embed on #suggestion-database
      suggestionMessage.edit(
        createEmbed({
          message: message,
          fields: [
            { name: 'Name', value: suggestion.get('name') },
            { name: 'Description', value: suggestion.get('description') },
            { name: 'UUID', value: suggestion.get('uuid') },
            { name: 'Status', value: suggestion.get('status') },
            { name: 'Doability', value: suggestion.get('doability') },
          ],
        })
      );
      //put the id of the embed on #to-do-list on the suggestion row
      suggestionTable.update(
        { todoList_id: todoEmbed.id },
        { where: { uuid: args.uuid } }
      );
    } else if (args.flag === '--finish') {
      const suggestion = await suggestionTable.findOne({
        where: { uuid: args.uuid },
      });
      this.client.users.cache.get(suggestion.get('user_id')).send(
        createEmbed({
          message: message,
          color: '#1565C0',
          title: 'Yay!',
          description:
            'Your suggestion has been finished! You can see the update on #updates.',
          authorBool: true,
        })
      );
      await this.client.channels.cache.get(updateChannel).send(
        createEmbed({
          message: message,
          title: 'New update!',
          description: args.description,
          fields: [
            {
              name: 'Original suggestion',
              value: suggestion.get('description'),
            },
          ],
        })
      );
      const suggestionMessage = await this.client.channels.cache
        .get(databaseChannel)
        .messages.fetch(suggestion.get('suggestion_id'));
      suggestionMessage.delete();
      const todoMessage = await this.client.channels.cache
        .get(toDoChannel)
        .messages.fetch(suggestion.get('todolist_id'));
      todoMessage.delete();
      await suggestionTable.destroy({ where: { uuid: args.uuid } });
      //send update embed
    } else if (
      args.flag === '--cancel' &&
      message.author.id === process.env.YWSSP
    ) {
      const suggestion = await suggestionTable.findOne({
        where: { uuid: args.uuid },
      });
      this.client.users.cache.get(suggestion.get('user_id')).send(
        createEmbed({
          message: message,
          color: '#F44336',
          title: '._.',
          description:
            'Your suggestion has been removed by ywssp. He also left you a note.',
          fields: [{ name: 'Reason', value: args.description }],
          authorBool: true,
        })
      );
      const suggestionMessage = await this.client.channels.cache
        .get(databaseChannel)
        .messages.fetch(suggestion.get('suggestion_id'));
      suggestionMessage.delete();
      const todoMessage = await this.client.channels.cache
        .get(toDoChannel)
        .messages.fetch(suggestion.get('todolist_id'));
      if (todoMessage) {
        todoMessage.delete();
      }
      await suggestionTable.destroy({ where: { uuid: args.uuid } });
    }
  }
}

module.exports = ActivityCommand;
