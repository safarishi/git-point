import React, { Component } from 'react';
import {
  FlatList,
  KeyboardAvoidingView,
  Keyboard,
  Linking
} from 'react-native';
import { Icon } from 'react-native-elements';

import {
  ViewContainer,
  LoadingContainer,
  IssueDescription,
  CommentListItem,
  CommentInput
} from 'components';

import { colors } from 'config';

import { connect } from 'react-redux';
import {
  getIssueComments,
  postIssueComment,
  getPullRequestDetails,
  getIssueFromUrl
} from '../issue.action';

import { getRepository } from 'repository';

const mapStateToProps = state => ({
  authUser: state.auth.user,
  repository: state.repository.repository,
  issue: state.issue.issue,
  diff: state.issue.diff,
  isMerged: state.issue.isMerged,
  comments: state.issue.comments,
  isPendingDiff: state.issue.isPendingDiff,
  isPendingCheckMerge: state.issue.isPendingCheckMerge,
  isPendingComments: state.issue.isPendingComments,
  isPostingComment: state.issue.isPostingComment,
  isPendingIssue: state.issue.isPendingIssue
});

const mapDispatchToProps = dispatch => ({
  getIssueComments: url => dispatch(getIssueComments(url)),
  postIssueComment: (body, owner, repoName, issueNum) =>
    dispatch(postIssueComment(body, owner, repoName, issueNum)),
  getPullRequestDetails: url => dispatch(getPullRequestDetails(url)),
  getIssueFromUrl: url => dispatch(getIssueFromUrl(url)),
  getRepository: url => dispatch(getRepository(url))
});

class Issue extends Component {
  props: {
    getIssueComments: Function,
    getPullRequestDetails: Function,
    getRepository: Function,
    postIssueComment: Function,
    getIssueFromUrl: Function,
    issue: Object,
    diff: string,
    isMerged: boolean,
    authUser: Object,
    repository: Object,
    comments: Array,
    isPendingDiff: boolean,
    isPendingCheckMerge: boolean,
    isPendingComments: boolean,
    isPostingComment: boolean,
    isPendingIssue: boolean,
    navigation: Object
  };

  static navigationOptions = ({ navigation }) => {
    const { state, navigate } = navigation;

    if (state.params.userHasPushPermission) {
      return {
        headerRight: (
          <Icon
            name="gear"
            color={colors.primarydark}
            type="octicon"
            containerStyle={{ marginRight: 5 }}
            underlayColor={colors.transparent}
            onPress={() =>
              navigate('IssueSettings', {
                issue: state.params.issue
              })}
          />
        )
      };
    }
  };

  componentDidMount() {
    const {
      navigation,
      repository,
      getIssueComments,
      getRepository,
      getPullRequestDetails
    } = this.props;
    const issue = navigation.state.params.issue;

    getIssueComments(issue);

    if (
      repository.full_name !==
      issue.repository_url.replace('https://api.github.com/repos/', '')
    ) {
      getRepository(issue.repository_url).then(() => {
        this.setNavigationParams();

        if (issue.pull_request) {
          getPullRequestDetails(issue);
        }
      });
    } else {
      this.setNavigationParams();

      if (issue.pull_request) {
        getPullRequestDetails(issue);
      }
    }
  }

  setNavigationParams = () => {
    const { navigation, repository } = this.props;

    navigation.setParams({
      userHasPushPermission: repository.permissions.admin ||
        repository.permissions.push
    });
  };

  postComment = body => {
    const { repository, navigation } = this.props;

    const repoName = repository.name;
    const owner = repository.owner.login;
    const issueNum = navigation.state.params.issue.number;

    this.props.postIssueComment(body, owner, repoName, issueNum);
    Keyboard.dismiss();
    this.refs.commentsListRef.scrollToEnd();
  };

  renderHeader = () => {
    const {
      issue,
      diff,
      isMerged,
      isPendingDiff,
      isPendingCheckMerge,
      navigation
    } = this.props;

    return (
      <IssueDescription
        issue={issue}
        diff={diff}
        isMerged={isMerged}
        isPendingDiff={isPendingDiff}
        isPendingCheckMerge={isPendingCheckMerge}
        onRepositoryPress={url => this.onRepositoryPress(url)}
        onLinkPress={node => this.onLinkPress(node)}
        userHasPushPermission={navigation.state.params.userHasPushPermission}
        navigation={navigation}
      />
    );
  };

  renderItem = ({ item }) => (
    <CommentListItem
      comment={item}
      onLinkPress={node => this.onLinkPress(node)}
      navigation={this.props.navigation}
    />
  );

  onLinkPress = node => {
    const { getIssueFromUrl, navigation } = this.props;

    if (node.attribs.class && node.attribs.class.includes('user-mention')) {
      navigation.navigate('Profile', {
        user: { login: node.children[0].data.substring(1) }
      });
    } else if (
      node.attribs.class && node.attribs.class.includes('issue-link')
    ) {
      getIssueFromUrl(
        node.attribs['data-url'].replace('github.com', 'api.github.com/repos')
      ).then(() => {
        navigation.navigate('Issue', {
          issue: this.props.issue
        });
      });
    } else {
      Linking.openURL(node.attribs.href);
    }
  };

  onRepositoryPress = url => {
    const { navigation } = this.props;

    navigation.navigate('Repository', {
      repositoryUrl: url
    });
  };

  render() {
    const { issue, comments, isPendingComments, navigation } = this.props;

    return (
      <ViewContainer>
        {isPendingComments &&
          <LoadingContainer animating={isPendingComments} center />}

        {!isPendingComments &&
          issue &&
          <KeyboardAvoidingView
            style={{ flex: 1 }}
            behavior={'padding'}
            keyboardVerticalOffset={65}
          >

            <FlatList
              ref="commentsListRef"
              contentContainerStyle={{ flexGrow: 1 }}
              ListHeaderComponent={this.renderHeader}
              removeClippedSubviews={false}
              data={[issue, ...comments]}
              keyExtractor={this.keyExtractor}
              renderItem={this.renderItem}
            />

            <CommentInput
              userHasPushPermission={
                navigation.state.params.userHasPushPermission
              }
              issueLocked={issue.locked}
              onSubmitEditing={this.postComment}
            />
          </KeyboardAvoidingView>}
      </ViewContainer>
    );
  }

  keyExtractor = item => {
    return item.id;
  };
}

export const IssueScreen = connect(mapStateToProps, mapDispatchToProps)(Issue);
