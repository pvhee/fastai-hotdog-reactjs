import React from 'react';
import Dropzone from 'react-dropzone';
import request from 'superagent';
import './App.css';

const CLOUDINARY_UPLOAD_PRESET = 'qgwhvjvm';
const CLOUDINARY_UPLOAD_URL = 'https://api.cloudinary.com/v1_1/diqgepqcc/image/upload';
// Upload limit, in bytes
const CLOUDINARY_UPLOAD_MAX_BYTES = 3000000;

export default class App extends React.Component {

  constructor(props) {
    super(props);

    this.initialState = {
      uploadedFile: null,
      imageFiles: [],
      email: '',
      hasAccepted: true,
      formValid: true,
      uploading: false,
      uploadedFileCloudinaryUrl: '',
      error: '',
      prediction: null,
      confidence: null,
    };
    this.state = this.initialState;
    this.handleChange = this.handleChange.bind(this);
  }

  /**
   * Trigger when component mounts.
   */
  componentDidMount() {
    var state = this;
    setTimeout(function () {
      state.sendFormHeightMessage();
    }, 250);
  }

  /**
   * Trigger when component updates;
   */
  componentDidUpdate() {
    this.sendFormHeightMessage();
  }

  /**
   * Send form height message to parent iframe.
   */
  sendFormHeightMessage() {
    const formHeight = document.getElementById('root').clientHeight;
    window.parent.postMessage('{"iframe_height":"' + formHeight + '"}','*');
  }

  onImageDrop(image_files) {
    if (image_files.some(file => file.size >= CLOUDINARY_UPLOAD_MAX_BYTES)) {
      const limitInMB = CLOUDINARY_UPLOAD_MAX_BYTES / 1000000;
      this.setState({
        error: `Your image exceeds the ${ limitInMB } MB limit.`
      });
    } else {
      this.setState({
        uploadedFile: image_files[0],
        imageFiles: image_files,
        error: ''
      });
    }
  }

  handleChange(e) {
    const target = e.target;
    const value = target.type === 'checkbox' ? target.checked : target.value;
    const name = target.name;

    // Set our state so we make sure form state and reactjs state are the same
    this.setState({
      [name]: value
    });
  }

  showInputError(refName) {
    const validity = this.refs[refName].validity;

    if (!validity.valid) {
      return false;
    }

    return true;
  }

  handleFormSubmit(e) {
    e.preventDefault();

    this.setState({uploading: true});

    this.handleImageUpload(this.state.uploadedFile);
  }

  handleImageReset(e) {
    e.preventDefault();

    this.setState({
      uploadedFile: true,
      imageFiles: []
    });
  }

  handleFormReset(e) {
    e.preventDefault();
    // Let's keep the email address but reset everything else
    // const email = this.state.email;
    this.setState(this.initialState);
    this.setState({
      // email: email,
      formValid: true
    });
  }

  handleImageUpload(file) {
    console.log(file);

    let upload = request.post(CLOUDINARY_UPLOAD_URL)
                     .field('upload_preset', CLOUDINARY_UPLOAD_PRESET)
                     // .field('context', 'email=' + email)
                     // If we need to add more context, use something like
                     // .field('context', 'alt=' + alt + '|caption=' + email)
                     // .field('tags', [tag])
                     .field('file', file);

    upload.end((err, response) => {
      if (err) {
        console.error(err);
      }

      if (response.body.secure_url !== '') {

            // this.setState({
            //   uploadedFileCloudinaryUrl: response.body.secure_url
            // });

        console.log(response.body.secure_url);

        let that = this;
        this.makePrediction(response.body.secure_url)
         .then(function(data) {
            console.log(data);
            console.log('WE ARE FINISHED NOW.....');
            that.setState({
              uploadedFileCloudinaryUrl: response.body.secure_url,
              prediction: data.class, 
              confidence: data.confidence,
            });
         });


      }
    });
  }

  makePrediction(url) {
    return new Promise(function(resolve, reject) {
      console.log(url);
      fetch('https://c5nostwq4c.execute-api.us-east-1.amazonaws.com/dev/invoke', {
        method: 'POST',
        mode: 'cors',
        headers: {
          "Content-type": "application/json"
        },
        body: JSON.stringify({
          'url': url,
        })
      })
        .then(function(data) {
          return data.json();
        })
        .then(function(data) {
          resolve(data);
        })
        .catch(function(err) {
          reject(err);
        });
    });
  }

  render() {
    return (
      <form>
        {this.state.uploadedFileCloudinaryUrl === '' ?
        <div>
          <div className="FileUpload">
            <div className="dropzone__wrapper">
              {this.state.imageFiles.length < 1 ?
              <Dropzone
                onDrop={this.onImageDrop.bind(this)}
                multiple={false}
                className="dropzone"
                activeClassName="dropzone--active"
                accept="image/jpeg,image/jpg">
                <p className="cross">&#43;</p>
                <p className="font--centre">Drop image here or <br/>click to upload <br/><span className="font--small">(Images accepted as .jpg .png)</span></p>
              </Dropzone>
              : null}
              {this.state.imageFiles.length > 0 ?
              <div className="fuga__img-uploaded">
                <span className="preview">
                  <span>Preview</span>
                  {this.state.imageFiles.map((file) => <img src={file.preview} alt=""/> )}
                </span>
                <p className="font--small font--centre"><a className="link" href="#" onClick={this.handleImageReset.bind(this)}>Remove image</a></p>
              </div>
              : null}
              {this.state.error ?
              <p className="font--small font--centre error">{this.state.error}</p>
              : null}
            </div>
            <div className="upload-button">
              {this.state.uploading ? <span className="loading"></span> : null}
              <input className={this.state.uploading ? 'active' : null} type="submit" value={this.state.uploading ? 'Predicting...' : 'Hotdog or not?'} disabled={!this.state.formValid || !this.state.uploadedFile || this.state.uploading} onClick={this.handleFormSubmit.bind(this)} />
            </div>
          </div>
        </div>
        :
        <div>
          <div className="fuga__thank-you">
            <h3>Your prediction: {this.state.prediction}</h3>
            <p>With a confidence of {this.state.confidence}</p>
          </div>
          <p className="font--centre"><a className="link" href="#" onClick={this.handleFormReset.bind(this)}>Make another prediction?</a></p>
        </div>
        }
      </form>
    )
  }
}
