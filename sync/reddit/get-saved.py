#!/usr/bin/python

import json
import os
from   pprint import pprint
import praw
import sys
import time

'''
Reddit API status page: https://reddit.statuspage.io/
Discussion: https://www.reddit.com/r/redditdev/
'''

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
  listing = reddit.user.me().saved(limit=None)

  for l in listing:
    # If file exists, break
    if os.path.exists('saved/{}.json'.format(l)):
      print('Skipping saved {}...'.format(l))

      # Unsave
      '''
      if isinstance(l, praw.models.reddit.submission.Submission):
        reddit.submission(id=l).unsave()
      else:
        reddit.comment(id=l).unsave()
      '''

      continue


    if isinstance(l, praw.models.reddit.submission.Submission):
      print('SUBMISSION: ', end = '')
      save_submission(l)
    else:
      print('COMMENT: ', end = '')
      save_comment(l)
    time.sleep(1)

'''
    try:
      print('{} is a submission...'.format(l))
      pprint(vars(submission))
    except:
      pass
    try:
      comment = reddit.comment(id=l)
      print('{} is a comment...'.format(l))
      pprint(vars(comment))
    except:
      pass
    if not (comment or submission):
      print('{} is not available, skipping...'.format(l))
      continue
    sys.exit()
'''


def save_submission(l):
  msg = {}
  # Submission
  # https://praw.readthedocs.io/en/latest/code_overview/models/submission.html#praw.models.Submission
  submission = reddit.submission(id=l)

  try:
    msg['author_name'] = submission.author.name
  except:
    msg['author_name'] = 'Deleted' 
  msg['created_utc'] = submission.created_utc
  msg['distinguished'] = submission.distinguished
  msg['edited'] = submission.edited
  msg['id'] = submission.id
  msg['is_self'] = submission.is_self
  try:
    msg['link_flair_text'] = submission.link_flair_text
    msg['link_flair_template_id'] = submission.link_flair_template_id
  except:
    pass
  msg['locked'] = submission.locked
  try:
    msg['name'] = submission.name
  except:
    pass
  msg['num_comments'] = submission.num_comments
  msg['over_18'] = submission.over_18
  msg['permalink'] = submission.permalink
  msg['score'] = submission.score
  msg['selftext'] = submission.selftext
  msg['spoiler'] = submission.spoiler
  msg['stickied'] = submission.stickied
  msg['subreddit_name'] = submission.subreddit.name
  msg['subreddit_id'] = submission.subreddit.id
  msg['subreddit_display_name'] = submission.subreddit.display_name
  msg['title'] = submission.title
  msg['upvote_ratio'] = submission.upvote_ratio
  msg['url'] = submission.url

  with open('saved/{}.json'.format(l), 'w') as msg_outfile:
    print('Writing saved {}...'.format(l))
    json.dump(msg, msg_outfile)


def save_comment(l):
  msg = {}
  # https://praw.readthedocs.io/en/latest/code_overview/models/comment.html?highlight=comment#praw.models.Comment
  comment = reddit.comment(id=l)

  try:
    msg['author_name'] = submission.author.name
  except:
    msg['author_name'] = 'Deleted' 
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

  with open('saved/{}.json'.format(l), 'w') as msg_outfile:
    print('Writing saved {}...'.format(l))
    json.dump(msg, msg_outfile)

  # comment.replies # CommentForest
  # comment.submission # Submission
  # comment.subreddit # Subreddit


if __name__ == "__main__":
  main()
