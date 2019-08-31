#!/usr/bin/python

import json
import os
from   pprint import pprint
import praw
import sys
import time

creds = json.load(open('reddit.creds'))
client_id = creds['client_id']
client_secret = creds['client_secret']
refresh_token = creds['refresh_token']

# Connect - use auth.py to generate the refresh_token
# should not expire https://www.reddit.com/r/redditdev/comments/b6bu0j/refresh_token_expiration/
reddit = praw.Reddit(client_id=client_id,
                     client_secret=client_secret,
                     refresh_token=refresh_token,
                     user_agent='pensieve-import')
# print(reddit.auth.scopes())

def main():
  # print(reddit.auth.scopes())
  # listing = reddit.redditor('randomfoo2').comments.new()
  listing = reddit.user.me().comments.new(limit=None)

  for l in listing:
    # If file exists, break
    if os.path.exists('comments/{}.json'.format(l)):
      print('Skipping comment {}...'.format(l))
      continue

    # Create New File
    print('Writing comment {}...'.format(l))

    # https://praw.readthedocs.io/en/latest/code_overview/models/comment.html?highlight=comment#praw.models.Comment
    msg = {}
    comment = reddit.comment(id=l)
    msg['author_name'] = comment.author.name
    msg['body'] = comment.body
    msg['created_utc'] = comment.created_utc
    msg['distinguished'] = comment.distinguished
    msg['edited'] = comment.edited
    msg['id'] = comment.id
    msg['is_submitter'] = comment.is_submitter
    msg['link_id'] = comment.link_id
    msg['parent_id'] = comment.parent_id
    msg['permalink'] = comment.permalink
    msg['score'] = comment.score
    msg['stickied'] = comment.stickied
    msg['submission_id'] = comment.submission.id
    msg['submission_permalink'] = comment.submission.permalink
    msg['subreddit_display_name'] = comment.subreddit.display_name
    msg['subreddit_name'] = comment.subreddit.name
    msg['subreddit_id'] = comment.subreddit.id

    with open('comments/{}.json'.format(l), 'w') as msg_outfile:
      json.dump(msg, msg_outfile)

    # comment.replies # CommentForest
    # comment.submission # Submission
    # comment.subreddit # Subreddit

    # sys.exit()

    time.sleep(1)


if __name__ == "__main__":
  main()
