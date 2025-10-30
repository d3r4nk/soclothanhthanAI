import discord
from discord.ext import commands
from music_cog import music_cog
from help_cog import help_cog

intents = discord.Intents.default()
intents.message_content = True
intents.voice_states = True
intents.guilds = True

bot = commands.Bot(command_prefix='!', intents=intents)
bot.remove_command('help')

@bot.event
async def on_ready():
    print(f'{bot.user} has connected to Discord!')
    await bot.add_cog(music_cog(bot))
    await bot.add_cog(help_cog(bot))

with open('token.txt', 'r') as file:
    token = file.readline().strip()

bot.run(token)